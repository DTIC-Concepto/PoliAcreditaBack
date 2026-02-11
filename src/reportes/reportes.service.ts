import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { CarreraAsignaturaModel } from '../asignaturas/models/carrera-asignatura.model';
import { AsignaturaModel } from '../asignaturas/models/asignatura.model';
import { RaaModel } from '../raa/models/raa.model';
import { RaaRaModel } from '../mappings/models/raa-ra.model';
import { RaEuraceModel } from '../mappings/models/ra-eurace.model';
import { RaOppModel } from '../mappings/models/ra-opp.model';
import { ResultadoAprendizajeModel } from '../resultados-aprendizaje/models/resultado-aprendizaje.model';
import { EurAceModel } from '../eur-ace/models/eur-ace.model';
import { OppModel } from '../opp/models/opp.model';
import { CarreraModel } from '../carreras/models/carrera.model';
import { NivelAporteEnum } from '../common/enums/nivel-aporte.enum';
import {
  MatrizAsignaturasEuraceResponseDto,
  AsignaturaSimpleDto,
  EurAceSimpleDto,
  MappingMatrizDto,
  MatrizStatsDto,
} from './dto/matriz-asignaturas-eurace.dto';
import {
  TrazabilidadAsignaturaResponseDto,
  TrazabilidadItemDto,
  AsignaturaInfoDto,
  RaaInfoDto,
  RaInfoDto,
  EurAceDetalleDto,
} from './dto/trazabilidad-asignatura.dto';
import {
  OppRaAsignaturasResponseDto,
  OppConRaYAsignaturasDto,
  RaConAsignaturasDto,
  AsignaturaConNivelDto,
} from './dto/opp-ra-asignaturas.dto';

@Injectable()
export class ReportesService {
  constructor(
    @InjectModel(CarreraAsignaturaModel)
    private readonly carreraAsignaturaModel: typeof CarreraAsignaturaModel,
    @InjectModel(AsignaturaModel)
    private readonly asignaturaModel: typeof AsignaturaModel,
    @InjectModel(RaaModel)
    private readonly raaModel: typeof RaaModel,
    @InjectModel(RaaRaModel)
    private readonly raaRaModel: typeof RaaRaModel,
    @InjectModel(RaEuraceModel)
    private readonly raEuraceModel: typeof RaEuraceModel,
    @InjectModel(RaOppModel)
    private readonly raOppModel: typeof RaOppModel,
    @InjectModel(ResultadoAprendizajeModel)
    private readonly resultadoAprendizajeModel: typeof ResultadoAprendizajeModel,
    @InjectModel(EurAceModel)
    private readonly eurAceModel: typeof EurAceModel,
    @InjectModel(OppModel)
    private readonly oppModel: typeof OppModel,
    @InjectModel(CarreraModel)
    private readonly carreraModel: typeof CarreraModel,
  ) {}

  async getMatrizAsignaturasEurace(
    carreraId: number,
    nivelesAporte?: NivelAporteEnum[],
    search?: string,
  ): Promise<MatrizAsignaturasEuraceResponseDto> {
    // 1. Verificar que la carrera existe
    const carrera = await this.carreraModel.findByPk(carreraId);
    if (!carrera) {
      throw new NotFoundException(
        `No se encontró la carrera con ID ${carreraId}`,
      );
    }

    // 2. Obtener todos los criterios EUR-ACE
    const eurAces = await this.eurAceModel.findAll({
      order: [['codigo', 'ASC']],
    });

    // 3. Obtener todas las asignaturas de la carrera
    const carreraAsignaturas = await this.carreraAsignaturaModel.findAll({
      where: { carreraId },
    });

    if (carreraAsignaturas.length === 0) {
      throw new NotFoundException(
        `No se encontraron asignaturas para la carrera con ID ${carreraId}`,
      );
    }

    // Obtener los IDs de las asignaturas
    const asignaturaIds = carreraAsignaturas.map((ca) => ca.asignaturaId);

    // Obtener las asignaturas activas con filtro de búsqueda opcional
    const whereAsignatura: any = {
      id: asignaturaIds,
      estadoActivo: true,
    };

    // Aplicar filtro de búsqueda por código o nombre
    if (search && search.trim() !== '') {
      whereAsignatura[Op.or] = [
        {
          codigo: {
            [Op.iLike]: `%${search.trim()}%`,
          },
        },
        {
          nombre: {
            [Op.iLike]: `%${search.trim()}%`,
          },
        },
      ];
    }

    const asignaturas = await this.asignaturaModel.findAll({
      where: whereAsignatura,
      order: [['codigo', 'ASC']],
    });

    // Si no hay asignaturas después del filtro, retornar respuesta vacía
    if (asignaturas.length === 0) {
      return {
        asignaturas: [],
        eurAceCriteria: eurAces.map((eurAce) => {
          const eurAceData = eurAce.get({ plain: true });
          return {
            id: eurAceData.id,
            code: eurAceData.codigo,
            name: eurAceData.descripcion,
            description: eurAceData.descripcion,
            active: true,
          };
        }),
        mappings: [],
        programId: carreraId,
        programName: carrera.nombre,
        stats: {
          totalAsignaturas: 0,
          totalEurAce: eurAces.length,
          totalMappings: 0,
          coveragePercentage: 0,
        },
      };
    }

    // Crear un mapa de asignaturaId -> carreraAsignaturaId (solo para las asignaturas filtradas)
    const filteredAsignaturaIds = asignaturas.map((a) => a.id);
    const asignaturaToCarreraAsignaturaMap = new Map(
      carreraAsignaturas
        .filter((ca) => filteredAsignaturaIds.includes(ca.asignaturaId))
        .map((ca) => [ca.asignaturaId, ca.id]),
    );

    // 4. Construir la matriz de mappings
    const mappings: MappingMatrizDto[] = [];

    for (const asignatura of asignaturas) {
      const carreraAsignaturaId = asignaturaToCarreraAsignaturaMap.get(
        asignatura.id,
      );

      if (!carreraAsignaturaId) continue;

      // Obtener todos los RAAs de esta asignatura
      const raas = await this.raaModel.findAll({
        where: {
          carreraAsignaturaId: carreraAsignaturaId,
          estadoActivo: true,
        },
      });

      const raaIds = raas.map((raa) => raa.id);

      // Si no hay RAAs, agregar mappings vacíos para todos los EUR-ACE
      if (raaIds.length === 0) {
        for (const eurAce of eurAces) {
          mappings.push({
            asignaturaId: asignatura.id,
            eurAceId: eurAce.id,
            hasMapping: false,
            nivelesAporte: [],
            cantidadRAAs: 0,
          });
        }
        continue;
      }

      // Obtener las relaciones RAA -> RA con nivel de aporte
      const whereRaaRa: any = {
        raaId: raaIds,
        estadoActivo: true,
      };

      if (nivelesAporte && nivelesAporte.length > 0) {
        whereRaaRa.nivelAporte = nivelesAporte;
      }

      const raaRas = await this.raaRaModel.findAll({
        where: whereRaaRa,
      });

      const raIds = [
        ...new Set(raaRas.map((raaRa) => raaRa.resultadoAprendizajeId)),
      ];

      // Si no hay relaciones RAA-RA, agregar mappings vacíos
      if (raIds.length === 0) {
        for (const eurAce of eurAces) {
          mappings.push({
            asignaturaId: asignatura.id,
            eurAceId: eurAce.id,
            hasMapping: false,
            nivelesAporte: [],
            cantidadRAAs: 0,
          });
        }
        continue;
      }

      // Obtener las relaciones RA -> EUR-ACE
      const whereRaEurace: any = {
        resultadoAprendizajeId: raIds,
        estadoActivo: true,
      };

      const raEuraces = await this.raEuraceModel.findAll({
        where: whereRaEurace,
      });

      // Crear un mapa de RA -> EUR-ACE
      const raToEurAceMap = new Map<number, number[]>();
      raEuraces.forEach((raEurace) => {
        if (!raToEurAceMap.has(raEurace.resultadoAprendizajeId)) {
          raToEurAceMap.set(raEurace.resultadoAprendizajeId, []);
        }
        raToEurAceMap
          .get(raEurace.resultadoAprendizajeId)!
          .push(raEurace.eurAceId);
      });

      // Crear un mapa de RAA -> niveles de aporte por RA
      const raaToNivelesMap = new Map<number, Map<number, NivelAporteEnum>>();
      raaRas.forEach((raaRa) => {
        if (!raaToNivelesMap.has(raaRa.raaId)) {
          raaToNivelesMap.set(raaRa.raaId, new Map());
        }
        raaToNivelesMap
          .get(raaRa.raaId)!
          .set(raaRa.resultadoAprendizajeId, raaRa.nivelAporte);
      });

      // Mapear RAA -> EUR-ACE con niveles de aporte
      const raaToEurAceNivelesMap = new Map<
        number,
        Map<number, Set<NivelAporteEnum>>
      >();

      for (const [raaId, raNivelesMap] of raaToNivelesMap.entries()) {
        raaToEurAceNivelesMap.set(raaId, new Map());

        for (const [raId, nivelAporte] of raNivelesMap.entries()) {
          const eurAceIdsForRa = raToEurAceMap.get(raId) || [];

          for (const eurAceId of eurAceIdsForRa) {
            if (!raaToEurAceNivelesMap.get(raaId)!.has(eurAceId)) {
              raaToEurAceNivelesMap.get(raaId)!.set(eurAceId, new Set());
            }
            raaToEurAceNivelesMap
              .get(raaId)!
              .get(eurAceId)!
              .add(nivelAporte);
          }
        }
      }

      // Construir las relaciones finales por EUR-ACE
      const eurAceToRaasMap = new Map<number, Set<number>>();
      const eurAceToNivelesMap = new Map<number, Set<NivelAporteEnum>>();

      for (const [raaId, eurAceNivelesMap] of raaToEurAceNivelesMap.entries()) {
        for (const [eurAceId, niveles] of eurAceNivelesMap.entries()) {
          if (!eurAceToRaasMap.has(eurAceId)) {
            eurAceToRaasMap.set(eurAceId, new Set());
            eurAceToNivelesMap.set(eurAceId, new Set());
          }
          eurAceToRaasMap.get(eurAceId)!.add(raaId);
          niveles.forEach((nivel) =>
            eurAceToNivelesMap.get(eurAceId)!.add(nivel),
          );
        }
      }

      // Crear los mappings para cada EUR-ACE
      for (const eurAce of eurAces) {
        const hasMapping = eurAceToRaasMap.has(eurAce.id);
        mappings.push({
          asignaturaId: asignatura.id,
          eurAceId: eurAce.id,
          hasMapping,
          nivelesAporte: hasMapping
            ? Array.from(eurAceToNivelesMap.get(eurAce.id) || [])
            : [],
          cantidadRAAs: hasMapping
            ? eurAceToRaasMap.get(eurAce.id)!.size
            : 0,
        });
      }
    }

    // 5. Construir DTOs de asignaturas
    const asignaturasDto: AsignaturaSimpleDto[] = asignaturas.map(
      (asignatura) => {
        const asignaturaData = asignatura.get({ plain: true });
        return {
          id: asignaturaData.id,
          code: asignaturaData.codigo,
          name: asignaturaData.nombre,
          description: asignaturaData.descripcion || asignaturaData.nombre,
          active: asignaturaData.estadoActivo,
        };
      },
    );

    // 6. Construir DTOs de EUR-ACE
    const eurAceDto: EurAceSimpleDto[] = eurAces.map((eurAce) => {
      const eurAceData = eurAce.get({ plain: true });
      return {
        id: eurAceData.id,
        code: eurAceData.codigo,
        name: eurAceData.descripcion,
        description: eurAceData.descripcion,
        active: true,
      };
    });

    // 7. Calcular estadísticas
    const totalMappings = mappings.filter((m) => m.hasMapping).length;
    const maxPossibleMappings = asignaturas.length * eurAces.length;
    const coveragePercentage =
      maxPossibleMappings > 0
        ? Number(((totalMappings / maxPossibleMappings) * 100).toFixed(2))
        : 0;

    return {
      asignaturas: asignaturasDto,
      eurAceCriteria: eurAceDto,
      mappings,
      programId: carreraId,
      programName: carrera.nombre,
      stats: {
        totalAsignaturas: asignaturas.length,
        totalEurAce: eurAces.length,
        totalMappings,
        coveragePercentage,
      },
    };
  }

  async getTrazabilidadAsignatura(
    asignaturaId: number,
    carreraId: number,
    nivelesAporte?: NivelAporteEnum[],
  ): Promise<TrazabilidadAsignaturaResponseDto> {
    // 1. Verificar que existe la asignatura
    const asignatura = await this.asignaturaModel.findByPk(asignaturaId);
    if (!asignatura) {
      throw new NotFoundException(
        `Asignatura con ID ${asignaturaId} no encontrada`,
      );
    }

    // 2. Obtener la relación carrera-asignatura
    const carreraAsignatura = await this.carreraAsignaturaModel.findOne({
      where: {
        carreraId,
        asignaturaId,
      },
    });

    if (!carreraAsignatura) {
      throw new NotFoundException(
        `La asignatura ${asignaturaId} no pertenece a la carrera ${carreraId}`,
      );
    }

    // 3. Obtener todos los RAAs de esta asignatura
    const raas = await this.raaModel.findAll({
      where: {
        carreraAsignaturaId: carreraAsignatura.id,
        estadoActivo: true,
      },
      order: [['codigo', 'ASC']],
    });

    if (raas.length === 0) {
      return {
        asignatura: {
          id: asignatura.id,
          codigo: asignatura.codigo,
          nombre: asignatura.nombre,
        },
        trazabilidad: {
          [NivelAporteEnum.ALTO]: [],
          [NivelAporteEnum.MEDIO]: [],
          [NivelAporteEnum.BAJO]: [],
        },
      };
    }

    const raaIds = raas.map((raa) => raa.id);

    // 4. Obtener las relaciones RAA -> RA
    const whereRaaRa: any = {
      raaId: raaIds,
      estadoActivo: true,
    };

    if (nivelesAporte && nivelesAporte.length > 0) {
      whereRaaRa.nivelAporte = nivelesAporte;
    }

    const raaRas = await this.raaRaModel.findAll({
      where: whereRaaRa,
      include: [
        {
          model: ResultadoAprendizajeModel,
          as: 'resultadoAprendizaje',
          required: true,
        },
      ],
      order: [['nivelAporte', 'ASC']],
    });

    if (raaRas.length === 0) {
      return {
        asignatura: {
          id: asignatura.id,
          codigo: asignatura.codigo,
          nombre: asignatura.nombre,
        },
        trazabilidad: {
          [NivelAporteEnum.ALTO]: [],
          [NivelAporteEnum.MEDIO]: [],
          [NivelAporteEnum.BAJO]: [],
        },
      };
    }

    const raIds = [
      ...new Set(raaRas.map((raaRa) => raaRa.resultadoAprendizajeId)),
    ];

    // 5. Obtener las relaciones RA -> EUR-ACE
    const whereRaEurace: any = {
      resultadoAprendizajeId: raIds,
      estadoActivo: true,
    };

    const raEuraces = await this.raEuraceModel.findAll({
      where: whereRaEurace,
      include: [
        {
          model: EurAceModel,
          as: 'eurAce',
          required: true,
        },
      ],
    });

    if (raEuraces.length === 0) {
      return {
        asignatura: {
          id: asignatura.id,
          codigo: asignatura.codigo,
          nombre: asignatura.nombre,
        },
        trazabilidad: {
          [NivelAporteEnum.ALTO]: [],
          [NivelAporteEnum.MEDIO]: [],
          [NivelAporteEnum.BAJO]: [],
        },
      };
    }

    // 6. Construir el mapa de trazabilidad
    const raaMap = new Map(raas.map((raa) => [raa.id, raa]));
    const raMap = new Map<number, ResultadoAprendizajeModel>();
    raaRas.forEach((raaRa) => {
      if (!raMap.has(raaRa.resultadoAprendizajeId)) {
        raMap.set(raaRa.resultadoAprendizajeId, raaRa.resultadoAprendizaje);
      }
    });

    const raEuraceMap = new Map<number, RaEuraceModel[]>();
    raEuraces.forEach((raEurace) => {
      if (!raEuraceMap.has(raEurace.resultadoAprendizajeId)) {
        raEuraceMap.set(raEurace.resultadoAprendizajeId, []);
      }
      raEuraceMap.get(raEurace.resultadoAprendizajeId)!.push(raEurace);
    });

    // 7. Construir los items de trazabilidad
    const trazabilidadItems: TrazabilidadItemDto[] = [];

    for (const raaRa of raaRas) {
      const raa = raaMap.get(raaRa.raaId);
      const ra = raMap.get(raaRa.resultadoAprendizajeId);
      const raEuracesForRa =
        raEuraceMap.get(raaRa.resultadoAprendizajeId) || [];

      if (!raa || !ra) continue;

      for (const raEurace of raEuracesForRa) {
        trazabilidadItems.push({
          raa: {
            id: raa.id,
            codigo: raa.codigo,
            descripcion: raa.descripcion,
          },
          ra: {
            id: ra.id,
            codigo: ra.codigo,
            descripcion: ra.descripcion,
          },
          justificacionRaaRa: raaRa.justificacion || '',
          eurAce: {
            id: raEurace.eurAce.id,
            codigo: raEurace.eurAce.codigo,
            descripcion: raEurace.eurAce.descripcion,
          },
          justificacionRaEurace: raEurace.justificacion,
          nivelAporte: raaRa.nivelAporte,
        } as any);
      }
    }

    // 8. Agrupar por nivel de aporte
    const trazabilidad: Record<string, TrazabilidadItemDto[]> = {
      [NivelAporteEnum.ALTO]: [],
      [NivelAporteEnum.MEDIO]: [],
      [NivelAporteEnum.BAJO]: [],
    };

    trazabilidadItems.forEach((item: any) => {
      if (trazabilidad[item.nivelAporte]) {
        trazabilidad[item.nivelAporte].push(item);
      }
    });

    return {
      asignatura: {
        id: asignatura.id,
        codigo: asignatura.codigo,
        nombre: asignatura.nombre,
      },
      trazabilidad,
    };
  }

  async getOppRaAsignaturas(
    carreraId: number,
    nivelesAporte?: NivelAporteEnum[],
  ): Promise<OppRaAsignaturasResponseDto> {
    // 1. Verificar que la carrera existe
    const carrera = await this.carreraModel.findByPk(carreraId);
    if (!carrera) {
      throw new NotFoundException(
        `No se encontró la carrera con ID ${carreraId}`,
      );
    }

    // 2. Obtener todos los OPPs de la carrera
    const opps = await this.oppModel.findAll({
      where: {
        carreraId,
      },
      order: [['codigo', 'ASC']],
    });

    if (opps.length === 0) {
      return {
        carreraId,
        carreraNombre: carrera.nombre,
        opps: [],
      };
    }

    const oppIds = opps.map((opp) => opp.id);

    // 3. Obtener relaciones OPP → RA
    const raOpps = await this.raOppModel.findAll({
      where: {
        oppId: oppIds,
        estadoActivo: true,
      },
      include: [
        {
          model: ResultadoAprendizajeModel,
          as: 'resultadoAprendizaje',
          required: true,
        },
      ],
    });

    //console.log('📊 DEBUG - raOpps encontrados:', raOpps.length);
    /*if (raOpps.length > 0) {
      console.log('📊 DEBUG - Primer raOpp:', {
        id: raOpps[0].id,
        oppId: raOpps[0].oppId,
        raId: raOpps[0].resultadoAprendizajeId,
        raCodigo: raOpps[0].resultadoAprendizaje?.codigo,
      });
    }*/

    if (raOpps.length === 0) {
      return {
        carreraId,
        carreraNombre: carrera.nombre,
        opps: opps.map((opp) => ({
          opp: {
            id: opp.id,
            codigo: opp.codigo,
            descripcion: opp.descripcion,
          },
          resultadosAprendizaje: [],
        })),
      };
    }

    const raIds = [...new Set(raOpps.map((raOpp) => raOpp.resultadoAprendizajeId))];
    //console.log('📊 DEBUG - raIds únicos:', raIds);

    // 4. Obtener relaciones RA → RAA con filtro de niveles de aporte
    const whereRaaRa: any = {
      resultadoAprendizajeId: raIds,
      estadoActivo: true,
    };

    if (nivelesAporte && nivelesAporte.length > 0) {
      whereRaaRa.nivelAporte = nivelesAporte;
    }

    const raaRas = await this.raaRaModel.findAll({
      where: whereRaaRa,
    });

    //console.log('📊 DEBUG - raaRas encontrados:', raaRas.length);
    /*if (raaRas.length > 0) {
      console.log('📊 DEBUG - Primer raaRa:', {
        id: raaRas[0].id,
        raaId: raaRas[0].raaId,
        raId: raaRas[0].resultadoAprendizajeId,
        nivelAporte: raaRas[0].nivelAporte,
      });
    }*/

    if (raaRas.length === 0) {
      return {
        carreraId,
        carreraNombre: carrera.nombre,
        opps: opps.map((opp) => ({
          opp: {
            id: opp.id,
            codigo: opp.codigo,
            descripcion: opp.descripcion,
          },
          resultadosAprendizaje: [],
        })),
      };
    }

    const raaIds = [...new Set(raaRas.map((raaRa) => raaRa.raaId))];
    //console.log('📊 DEBUG - raaIds únicos:', raaIds);

    // 5. Obtener RAAs con sus carreraAsignaturas
    const raas = await this.raaModel.findAll({
      where: {
        id: raaIds,
      },
      include: [
        {
          model: CarreraAsignaturaModel,
          as: 'carreraAsignatura',
          required: true,
          where: {
            carreraId,
          },
        },
      ],
    });

    /*console.log('📊 DEBUG - raas encontrados:', raas.length);
    if (raas.length > 0) {
      console.log('📊 DEBUG - Primer raa:', {
        id: raas[0].id,
        codigo: raas[0].codigo,
        carreraAsignaturaId: raas[0].carreraAsignaturaId,
      });
    }*/

    const carreraAsignaturaIds = raas.map((raa) => raa.carreraAsignaturaId);
    //console.log('📊 DEBUG - carreraAsignaturaIds a buscar:', carreraAsignaturaIds);

    // 6. Obtener carreraAsignaturas
    const carreraAsignaturas = await this.carreraAsignaturaModel.findAll({
      where: {
        id: carreraAsignaturaIds,
      },
    });

    //console.log('📊 DEBUG - carreraAsignaturas encontradas:', carreraAsignaturas.length);

    // 7. Obtener asignaturas
    const asignaturaIds = [...new Set(carreraAsignaturas.map(ca => ca.asignaturaId))];
    //console.log('📊 DEBUG - asignaturaIds a buscar:', asignaturaIds);

    const asignaturas = await this.asignaturaModel.findAll({
      where: {
        id: asignaturaIds,
      },
    });

    //console.log('📊 DEBUG - asignaturas encontradas:', asignaturas.length);
    /*if (asignaturas.length > 0) {
      console.log('📊 DEBUG - Primera asignatura:', {
        id: asignaturas[0].id,
        codigo: asignaturas[0].codigo,
        nombre: asignaturas[0].nombre,
      });
    }*/

    // 8. Construir mapas para organizar la información
    const oppMap = new Map(opps.map((opp) => [opp.id, opp]));
    
    // Mapa: oppId → Set<raId>
    const oppToRaMap = new Map<number, Set<number>>();
    raOpps.forEach((raOpp) => {
      if (!oppToRaMap.has(raOpp.oppId)) {
        oppToRaMap.set(raOpp.oppId, new Set());
      }
      oppToRaMap.get(raOpp.oppId)!.add(raOpp.resultadoAprendizajeId);
    });

    // Mapa: raId → RA
    const raMap = new Map<number, ResultadoAprendizajeModel>();
    raOpps.forEach((raOpp) => {
      if (!raMap.has(raOpp.resultadoAprendizajeId)) {
        raMap.set(raOpp.resultadoAprendizajeId, raOpp.resultadoAprendizaje);
      }
    });

    // Mapa: asignaturaId → asignatura
    const asignaturaMap = new Map();
    asignaturas.forEach((asig) => {
      asignaturaMap.set(asig.id, asig.get({ plain: true }));
    });

    // Mapa: carreraAsignaturaId → asignaturaId
    const carreraAsignaturaToAsignaturaIdMap = new Map();
    carreraAsignaturas.forEach((ca) => {
      carreraAsignaturaToAsignaturaIdMap.set(ca.id, ca.asignaturaId);
    });

    // Mapa: raaId → carreraAsignaturaId
    const raaToCarreraAsignaturaMap = new Map();
    raas.forEach((raa) => {
      raaToCarreraAsignaturaMap.set(raa.id, raa.carreraAsignaturaId);
    });

    //console.log('📊 DEBUG - Mapas construidos:');
    //console.log('  - oppToRaMap size:', oppToRaMap.size);
    //console.log('  - raMap size:', raMap.size);
    //console.log('  - asignaturaMap size:', asignaturaMap.size);
    //console.log('  - carreraAsignaturaToAsignaturaIdMap size:', carreraAsignaturaToAsignaturaIdMap.size);
    //console.log('  - raaToCarreraAsignaturaMap size:', raaToCarreraAsignaturaMap.size);

    // Mapa: raId → Array<{asignatura, nivelAporte}>
    const raToAsignaturasMap = new Map<number, Array<{asignatura: any; nivelAporte: NivelAporteEnum}>>();
    raaRas.forEach((raaRa) => {
      const carreraAsignaturaId = raaToCarreraAsignaturaMap.get(raaRa.raaId);
      //console.log(`📊 DEBUG - Procesando raaRa.id=${raaRa.id}, raaId=${raaRa.raaId}, carreraAsignaturaId=${carreraAsignaturaId}`);
      
      if (!carreraAsignaturaId) {
        console.log(`  ❌ No se encontró carreraAsignaturaId para raaId=${raaRa.raaId}`);
        return;
      }

      const asignaturaId = carreraAsignaturaToAsignaturaIdMap.get(carreraAsignaturaId);
      console.log(`  - asignaturaId encontrado:`, asignaturaId);

      if (!asignaturaId) {
        console.log(`  ❌ No se encontró asignaturaId para carreraAsignaturaId=${carreraAsignaturaId}`);
        return;
      }

      const asignaturaData = asignaturaMap.get(asignaturaId);
      console.log(`  - asignaturaData encontrada:`, asignaturaData ? `id=${asignaturaData.id}, codigo=${asignaturaData.codigo}` : 'NO');
      
      if (!asignaturaData) {
        console.log(`  ❌ No se encontró asignatura para asignaturaId=${asignaturaId}`);
        return;
      }

      if (!raToAsignaturasMap.has(raaRa.resultadoAprendizajeId)) {
        raToAsignaturasMap.set(raaRa.resultadoAprendizajeId, []);
      }
      
      // Evitar duplicados de asignaturas para el mismo RA
      const existing = raToAsignaturasMap.get(raaRa.resultadoAprendizajeId)!;
      const isDuplicate = existing.some(item => item.asignatura.id === asignaturaData.id);
      
      if (!isDuplicate) {
        console.log(`  ✅ Agregando asignatura ${asignaturaData.codigo} al RA ${raaRa.resultadoAprendizajeId}`);
        raToAsignaturasMap.get(raaRa.resultadoAprendizajeId)!.push({
          asignatura: asignaturaData,
          nivelAporte: raaRa.nivelAporte,
        });
      } else {
        console.log(`  ⚠️  Asignatura duplicada, saltando...`);
      }
    });

    //console.log('📊 DEBUG - raToAsignaturasMap size:', raToAsignaturasMap.size);
    //console.log('📊 DEBUG - Contenido raToAsignaturasMap:');
    raToAsignaturasMap.forEach((asignaturas, raId) => {
      //console.log(`  RA ${raId}: ${asignaturas.length} asignaturas`);
    });

    // 8. Construir la respuesta
    const oppsResponse: OppConRaYAsignaturasDto[] = [];

    for (const opp of opps) {
      const raIdsForOpp = oppToRaMap.get(opp.id) || new Set();
      //console.log(`📊 DEBUG - OPP ${opp.codigo} tiene ${raIdsForOpp.size} RAs:`, Array.from(raIdsForOpp));
      
      const resultadosAprendizaje: RaConAsignaturasDto[] = [];

      for (const raId of raIdsForOpp) {
        const ra = raMap.get(raId);
        if (!ra) {
          console.log(`  ❌ No se encontró RA con id=${raId}`);
          continue;
        }

        const asignaturasData = raToAsignaturasMap.get(raId) || [];
        console.log(`  - RA ${ra.codigo} (id=${raId}) tiene ${asignaturasData.length} asignaturas`);
        
        // Solo incluir RAs que tengan asignaturas asociadas (que cumplan con el filtro)
        if (asignaturasData.length > 0) {
          const asignaturas: AsignaturaConNivelDto[] = asignaturasData.map(({ asignatura, nivelAporte }) => ({
            id: asignatura.id,
            codigo: asignatura.codigo,
            nombre: asignatura.nombre,
            nivelAporte,
          }));

          resultadosAprendizaje.push({
            ra: {
              id: ra.id,
              codigo: ra.codigo,
              descripcion: ra.descripcion,
            },
            asignaturas,
          });
          console.log(`  ✅ RA ${ra.codigo} agregado con ${asignaturas.length} asignaturas`);
        } else {
          console.log(`  ⚠️  RA ${ra.codigo} no tiene asignaturas, NO se agrega`);
        }
      }

      // Solo incluir OPP si tiene al menos un RA con asignaturas
      // Cuando hay filtro de niveles, solo mostrar OPPs con RAs que cumplan el filtro
      if (resultadosAprendizaje.length > 0) {
        oppsResponse.push({
          opp: {
            id: opp.id,
            codigo: opp.codigo,
            descripcion: opp.descripcion,
          },
          resultadosAprendizaje,
        });
        console.log(`  ✅ OPP ${opp.codigo} agregado con ${resultadosAprendizaje.length} RAs`);
      } else {
        console.log(`  ⚠️  OPP ${opp.codigo} no tiene RAs con asignaturas, NO se agrega`);
      }
    }

    return {
      carreraId,
      carreraNombre: carrera.nombre,
      opps: oppsResponse,
    };
  }
}
