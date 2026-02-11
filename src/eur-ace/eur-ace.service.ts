import { Injectable, ConflictException, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { EurAceModel } from './models/eur-ace.model';
import { CreateEurAceDto } from './dto/create-eur-ace.dto';
import { UpdateEurAceDto } from './dto/update-eur-ace.dto';
import { FilterEurAceDto } from './dto/filter-eur-ace.dto';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { EventoTipoEnum } from '../auditoria/enums/evento-tipo.enum';

@Injectable()
export class EurAceService {
  constructor(
    @InjectModel(EurAceModel)
    private readonly eurAceModel: typeof EurAceModel,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async create(
    createEurAceDto: CreateEurAceDto,
    usuarioId?: number,
  ): Promise<EurAceModel> {
    try {
      // Verificar unicidad del código
      const existingCriterio = await this.eurAceModel.findOne({
        where: { codigo: createEurAceDto.codigo },
      });

      if (existingCriterio) {
        throw new ConflictException(
          `Ya existe un criterio EUR-ACE con el código "${createEurAceDto.codigo}"`,
        );
      }

      // Crear el nuevo criterio
      const newCriterio = await this.eurAceModel.create({
        codigo: createEurAceDto.codigo,
        descripcion: createEurAceDto.descripcion,
      } as any);

      // Registrar en auditoría
      if (usuarioId) {
        await this.auditoriaService.registrarEvento({
          usuarioId,
          tipoEvento: EventoTipoEnum.CRITERIO_EUR_ACE_CREADO,
          descripcion: `Se creó el criterio EUR-ACE con código "${newCriterio.codigo}"`,
          entidad: 'eur_ace_criteria',
          entidadId: newCriterio.id,
          metadatos: {
            codigo: newCriterio.codigo,
            descripcion: newCriterio.descripcion,
          },
        });
      }

      return newCriterio;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Error interno del servidor al crear el criterio EUR-ACE',
      );
    }
  }

  async findAll(): Promise<EurAceModel[]> {
    return this.eurAceModel.findAll({
      order: [['codigo', 'ASC']],
    });
  }

  async findAllWithFiltersAndPagination(filterDto: FilterEurAceDto): Promise<{
    data: EurAceModel[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasPrevious: boolean;
    hasNext: boolean;
  }> {
    const { codigo, descripcion, page = 1, limit = 10 } = filterDto;

    // Construir filtros dinámicos
    const whereClause: any = {};

    if (codigo) {
      whereClause.codigo = {
        [Op.iLike]: `%${codigo}%`, // Búsqueda parcial case-insensitive
      };
    }

    if (descripcion) {
      whereClause.descripcion = {
        [Op.iLike]: `%${descripcion}%`, // Búsqueda parcial case-insensitive
      };
    }

    // Calcular offset para paginación
    const offset = (page - 1) * limit;

    try {
      // Ejecutar consulta con filtros, paginación y conteo total
      const { rows: data, count: total } = await this.eurAceModel.findAndCountAll({
        where: whereClause,
        order: [['codigo', 'ASC']],
        limit,
        offset,
      });

      // Calcular metadatos de paginación
      const totalPages = Math.ceil(total / limit);
      const hasPrevious = page > 1;
      const hasNext = page < totalPages;

      return {
        data,
        total,
        page,
        limit,
        totalPages,
        hasPrevious,
        hasNext,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        'Error interno del servidor al obtener los criterios EUR-ACE',
      );
    }
  }

  async findByCode(codigo: string): Promise<EurAceModel | null> {
    return this.eurAceModel.findOne({
      where: { codigo },
    });
  }

  async findById(id: number): Promise<EurAceModel | null> {
    return this.eurAceModel.findOne({
      where: { id },
    });
  }

  async update(
    id: number,
    updateEurAceDto: UpdateEurAceDto,
    usuarioId?: number,
  ): Promise<EurAceModel> {
    try {
      const criterio = await this.eurAceModel.findByPk(id);

      if (!criterio) {
        throw new NotFoundException('Criterio EUR-ACE no encontrado');
      }

      // Validar unicidad de código si se actualiza
      const nextCodigo = updateEurAceDto.codigo ?? criterio.codigo;

      if (nextCodigo !== criterio.codigo) {
        const existingCriterio = await this.eurAceModel.findOne({
          where: {
            codigo: nextCodigo,
            id: { [Op.ne]: id },
          },
        });

        if (existingCriterio) {
          throw new ConflictException(
            `Ya existe un criterio EUR-ACE con el código "${nextCodigo}"`,
          );
        }
      }

      await criterio.update(updateEurAceDto as any);

      // Registrar en auditoría
      if (usuarioId) {
        await this.auditoriaService.registrarEvento({
          usuarioId,
          tipoEvento: EventoTipoEnum.CRITERIO_EUR_ACE_ACTUALIZADO,
          descripcion: `Se actualizó el criterio EUR-ACE con código "${criterio.codigo}"`,
          entidad: 'eur_ace_criteria',
          entidadId: criterio.id,
          metadatos: {
            codigo: criterio.codigo,
            descripcion: criterio.descripcion,
          },
        });
      }

      return criterio;
    } catch (error) {
      if (error instanceof ConflictException || error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Error interno del servidor al actualizar el criterio EUR-ACE',
      );
    }
  }

  async remove(id: number, usuarioId?: number): Promise<void> {
    try {
      const criterio = await this.eurAceModel.findByPk(id);

      if (!criterio) {
        throw new NotFoundException('Criterio EUR-ACE no encontrado');
      }

      await criterio.destroy();

      // Registrar en auditoría
      if (usuarioId) {
        await this.auditoriaService.registrarEvento({
          usuarioId,
          tipoEvento: EventoTipoEnum.CRITERIO_EUR_ACE_ELIMINADO,
          descripcion: `Se eliminó el criterio EUR-ACE con código "${criterio.codigo}"`,
          entidad: 'eur_ace_criteria',
          entidadId: criterio.id,
          metadatos: {
            codigo: criterio.codigo,
            descripcion: criterio.descripcion,
          },
        });
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Error interno del servidor al eliminar el criterio EUR-ACE',
      );
    }
  }
}