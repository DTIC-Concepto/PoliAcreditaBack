import { Injectable, ConflictException, NotFoundException, Inject, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { OppModel } from './models/opp.model';
import { CreateOppDto } from './dto/create-opp.dto';
import { UpdateOppDto } from './dto/update-opp.dto';
import { FilterOppDto } from './dto/filter-opp.dto';
import { CarreraModel } from '../carreras/models/carrera.model';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { EventoTipoEnum } from '../auditoria/enums/evento-tipo.enum';
import { Op } from 'sequelize';

@Injectable()
export class OppService {
  constructor(
    @InjectModel(OppModel)
    private readonly oppModel: typeof OppModel,
    @InjectModel(CarreraModel)
    private readonly carreraModel: typeof CarreraModel,
    @Inject(AuditoriaService)
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async create(createOppDto: CreateOppDto, usuarioId: number): Promise<OppModel> {
    // Verificar que la carrera existe
    const carrera = await this.carreraModel.findByPk(createOppDto.carreraId);
    if (!carrera) {
      throw new NotFoundException('La carrera especificada no existe');
    }

    // Verificar unicidad del código
    const existingOpp = await this.oppModel.findOne({
      where: { 
        codigo: createOppDto.codigo,
        carreraId: createOppDto.carreraId
      },
    });

    if (existingOpp) {
      throw new ConflictException('Ya existe un Objetivo de Programa con este código para esta carrera');
    }

    // Crear el OPP
    const newOpp = await this.oppModel.create(createOppDto as any);

    // Registrar auditoría
    await this.auditoriaService.registrarEvento({
      usuarioId,
      tipoEvento: EventoTipoEnum.OBJETIVO_PROGRAMA_CREADO,
      descripcion: `Objetivo de Programa creado: ${newOpp.codigo}`,
      entidad: 'OPP',
      entidadId: newOpp.id,
      metadatos: {
        codigo: newOpp.codigo,
        descripcion: newOpp.descripcion,
        carreraId: newOpp.carreraId,
      },
    });

    return newOpp;
  }

  async findAllWithFiltersAndPagination(filters: FilterOppDto = {}) {
    const {
      search,
      page = 1,
      limit = 10,
      carreraId,
    } = filters;

    // Construir condiciones WHERE
    const whereConditions: any = {};

    // Filtro por carrera si se especifica
    if (carreraId) {
      whereConditions.carreraId = carreraId;
    }

    // Filtro de búsqueda por código o descripción
    if (search) {
      whereConditions[Op.or] = [
        { codigo: { [Op.iLike]: `%${search}%` } },
        { descripcion: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // Calcular offset para paginación
    const offset = (page - 1) * limit;

    // Ejecutar consulta con filtros y paginación
    const { rows, count } = await this.oppModel.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: CarreraModel,
          as: 'carrera',
          attributes: ['id', 'codigo', 'nombre'],
        },
      ],
      order: [['codigo', 'ASC']],
      limit,
      offset,
    });

    // Calcular información de paginación
    const totalPages = Math.ceil(count / limit);
    const hasPrevious = page > 1;
    const hasNext = page < totalPages;

    return {
      data: rows,
      total: count,
      page,
      limit,
      totalPages,
      hasPrevious,
      hasNext,
    };
  }

  async findById(id: number): Promise<OppModel | null> {
    return this.oppModel.findOne({
      where: { id },
      include: [
        {
          model: CarreraModel,
          as: 'carrera',
          attributes: ['id', 'codigo', 'nombre'],
        },
      ],
    });
  }

  async update(
    id: number,
    updateOppDto: UpdateOppDto,
    usuarioId?: number,
  ): Promise<OppModel> {
    try {
      const opp = await this.oppModel.findByPk(id);

      if (!opp) {
        throw new NotFoundException('Objetivo de Programa no encontrado');
      }

      // Validar carrera si se actualiza
      if (updateOppDto.carreraId && updateOppDto.carreraId !== opp.carreraId) {
        const carrera = await this.carreraModel.findByPk(updateOppDto.carreraId);
        if (!carrera) {
          throw new NotFoundException('La carrera especificada no existe');
        }
      }

      // Validar unicidad de código si se actualiza
      const nextCodigo = updateOppDto.codigo ?? opp.codigo;
      const nextCarreraId = updateOppDto.carreraId ?? opp.carreraId;

      if (nextCodigo !== opp.codigo || nextCarreraId !== opp.carreraId) {
        const existingOpp = await this.oppModel.findOne({
          where: {
            codigo: nextCodigo,
            carreraId: nextCarreraId,
            id: { [Op.ne]: id },
          },
        });

        if (existingOpp) {
          throw new ConflictException(
            `Ya existe un Objetivo de Programa con el código "${nextCodigo}" para esta carrera`,
          );
        }
      }

      await opp.update(updateOppDto as any);

      // Registrar auditoría
      if (usuarioId) {
        const carrera = await this.carreraModel.findByPk(opp.carreraId);
        await this.auditoriaService.registrarEvento({
          usuarioId,
          tipoEvento: EventoTipoEnum.OBJETIVO_PROGRAMA_ACTUALIZADO,
          descripcion: `Objetivo de Programa actualizado: ${opp.codigo}`,
          entidad: 'OPP',
          entidadId: opp.id,
          metadatos: {
            codigo: opp.codigo,
            descripcion: opp.descripcion,
            carreraId: opp.carreraId,
            carreraNombre: carrera?.nombre,
          },
        });
      }

      return opp;
    } catch (error) {
      if (error instanceof ConflictException || error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Error interno del servidor al actualizar el Objetivo de Programa',
      );
    }
  }

  async remove(id: number, usuarioId?: number): Promise<void> {
    try {
      const opp = await this.oppModel.findByPk(id);

      if (!opp) {
        throw new NotFoundException('Objetivo de Programa no encontrado');
      }

      await opp.destroy();

      // Registrar auditoría
      if (usuarioId) {
        const carrera = await this.carreraModel.findByPk(opp.carreraId);
        await this.auditoriaService.registrarEvento({
          usuarioId,
          tipoEvento: EventoTipoEnum.OBJETIVO_PROGRAMA_ELIMINADO,
          descripcion: `Objetivo de Programa eliminado: ${opp.codigo}`,
          entidad: 'OPP',
          entidadId: opp.id,
          metadatos: {
            codigo: opp.codigo,
            descripcion: opp.descripcion,
            carreraId: opp.carreraId,
            carreraNombre: carrera?.nombre,
          },
        });
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Error interno del servidor al eliminar el Objetivo de Programa',
      );
    }
  }
}