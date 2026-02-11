import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ReportesService } from './reportes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolEnum } from '../common/enums/rol.enum';
import {
  MatrizAsignaturasEuraceQueryDto,
  MatrizAsignaturasEuraceResponseDto,
} from './dto/matriz-asignaturas-eurace.dto';
import {
  TrazabilidadAsignaturaQueryDto,
  TrazabilidadAsignaturaResponseDto,
} from './dto/trazabilidad-asignatura.dto';
import {
  OppRaAsignaturasQueryDto,
  OppRaAsignaturasResponseDto,
} from './dto/opp-ra-asignaturas.dto';

@ApiBearerAuth()
@ApiTags('Reportes')
@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  RolEnum.CEI,
  RolEnum.COORDINADOR,
  RolEnum.DECANO,
  RolEnum.SUBDECANO,
  RolEnum.JEFE_DEPARTAMENTO,
  RolEnum.ADMINISTRADOR,
)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('matriz-asignaturas-eurace/:carreraId')
  @ApiOperation({
    summary: 'Obtener matriz de relaciones entre Asignaturas y Criterios EUR-ACE',
    description: `
    Genera una matriz que muestra todas las asignaturas de una carrera (filas) 
    contra todos los criterios EUR-ACE (columnas), indicando:
    - Si existe relación entre la asignatura y el criterio EUR-ACE
    - Los niveles de aporte encontrados (Alto, Medio, Bajo)
    - Cantidad de RAAs que relacionan la asignatura con el criterio EUR-ACE
    
    La relación se determina mediante la trazabilidad:
    Asignatura → RAA → RA → EUR-ACE
    
    **Roles autorizados**: CEI, COORDINADOR, DECANO, SUBDECANO, JEFE_DEPARTAMENTO, ADMINISTRADOR
    
    **Filtros opcionales**:
    - nivelesAporte: Filtrar por niveles de aporte (funciona como OR)
    - search: Buscar asignaturas por código o nombre (búsqueda parcial)
    `,
  })
  @ApiParam({
    name: 'carreraId',
    description: 'ID de la carrera',
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'nivelesAporte',
    description: 'Filtrar por niveles de aporte (funciona como OR)',
    required: false,
    isArray: true,
    enum: ['Alto', 'Medio', 'Bajo'],
  })
  @ApiQuery({
    name: 'search',
    description: 'Buscar asignaturas por código o nombre (búsqueda parcial, case-insensitive)',
    required: false,
    type: String,
    example: 'MATD',
  })
  @ApiResponse({
    status: 200,
    description: 'Matriz generada exitosamente',
    type: MatrizAsignaturasEuraceResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Carrera no encontrada o sin asignaturas',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para acceder a este recurso',
  })
  async getMatrizAsignaturasEurace(
    @Param('carreraId', ParseIntPipe) carreraId: number,
    @Query() query: MatrizAsignaturasEuraceQueryDto,
  ): Promise<MatrizAsignaturasEuraceResponseDto> {
    return this.reportesService.getMatrizAsignaturasEurace(
      carreraId,
      query.nivelesAporte,
      query.search,
    );
  }

  @Get('trazabilidad-asignatura/:asignaturaId')
  @ApiOperation({
    summary: 'Obtener trazabilidad detallada de una asignatura',
    description: `
    Muestra la trazabilidad completa de una asignatura, agrupada por nivel de aporte:
    
    Para cada relación muestra:
    - RAA (Resultado de Aprendizaje de Asignatura)
    - RA (Resultado de Aprendizaje) relacionado
    - Justificación de la relación RAA → RA
    - Criterio EUR-ACE relacionado con el RA
    - Justificación de la relación RA → EUR-ACE
    
    La información se agrupa por nivel de aporte (Alto, Medio, Bajo).
    
    **Roles autorizados**: CEI, COORDINADOR, DECANO, SUBDECANO, JEFE_DEPARTAMENTO, ADMINISTRADOR
    
    **Parámetros requeridos**:
    - carreraId: ID de la carrera (query param)
    
    **Filtros opcionales**:
    - nivelesAporte: Filtrar por niveles de aporte específicos
    `,
  })
  @ApiParam({
    name: 'asignaturaId',
    description: 'ID de la asignatura',
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'carreraId',
    description: 'ID de la carrera (requerido)',
    required: true,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'nivelesAporte',
    description: 'Filtrar por niveles de aporte específicos',
    required: false,
    isArray: true,
    enum: ['Alto', 'Medio', 'Bajo'],
  })
  @ApiResponse({
    status: 200,
    description: 'Trazabilidad obtenida exitosamente',
    type: TrazabilidadAsignaturaResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Asignatura no encontrada o no pertenece a la carrera',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para acceder a este recurso',
  })
  async getTrazabilidadAsignatura(
    @Param('asignaturaId', ParseIntPipe) asignaturaId: number,
    @Query() query: TrazabilidadAsignaturaQueryDto,
  ): Promise<TrazabilidadAsignaturaResponseDto> {
    return this.reportesService.getTrazabilidadAsignatura(
      asignaturaId,
      query.carreraId,
      query.nivelesAporte,
    );
  }

  @Get('opp-ra-asignaturas/:carreraId')
  @ApiOperation({
    summary: 'Obtener relación OPP → RA → Asignaturas',
    description: `
    Muestra la trazabilidad de Objetivos de Programa (OPP) hacia Resultados de Aprendizaje (RA)
    y las asignaturas asociadas a esos RA.
    
    La cadena de relación es:
    OPP → RA (mediante ra_opp) → RAA (mediante raa_ra con nivelAporte) → Asignatura
    
    Para cada OPP muestra:
    - Lista de RAs relacionados
    - Para cada RA: lista de asignaturas con su nivel de aporte
    
    **Roles autorizados**: CEI, COORDINADOR, DECANO, SUBDECANO, JEFE_DEPARTAMENTO, ADMINISTRADOR
    
    **Filtros opcionales**:
    - nivelesAporte: Filtrar por niveles de aporte (funciona como OR)
    `,
  })
  @ApiParam({
    name: 'carreraId',
    description: 'ID de la carrera',
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'nivelesAporte',
    description: 'Filtrar por niveles de aporte (funciona como OR)',
    required: false,
    isArray: true,
    enum: ['Alto', 'Medio', 'Bajo'],
  })
  @ApiResponse({
    status: 200,
    description: 'Relación OPP-RA-Asignaturas obtenida exitosamente',
    type: OppRaAsignaturasResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Carrera no encontrada',
  })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para acceder a este recurso',
  })
  async getOppRaAsignaturas(
    @Param('carreraId', ParseIntPipe) carreraId: number,
    @Query() query: OppRaAsignaturasQueryDto,
  ): Promise<OppRaAsignaturasResponseDto> {
    return this.reportesService.getOppRaAsignaturas(
      carreraId,
      query.nivelesAporte,
    );
  }
}
