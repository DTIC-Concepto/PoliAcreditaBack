import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Get,
  Query,
  Patch,
  Delete,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
  ApiUnauthorizedResponse,
  ApiBody,
  ApiParam,
} from '@nestjs/swagger';
import { ResultadosAprendizajeService } from './resultados-aprendizaje.service';
import { CreateResultadoAprendizajeDto } from './dto/create-resultado-aprendizaje.dto';
import { ResultadoAprendizajeResponseDto } from './dto/resultado-aprendizaje-response.dto';
import { FilterResultadoAprendizajeDto } from './dto/filter-resultado-aprendizaje.dto';
import { ResultadoAprendizajePaginatedResponseDto } from './dto/resultado-aprendizaje-paginated-response.dto';
import { UpdateResultadoAprendizajeDto } from './dto/update-resultado-aprendizaje.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UsuarioModel } from '../usuarios/models/usuario.model';
import { RolEnum } from '../common/enums/rol.enum';

@ApiTags('Resultados de Aprendizaje')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('learning-outcomes')
export class ResultadosAprendizajeController {
  constructor(private readonly resultadosAprendizajeService: ResultadosAprendizajeService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(RolEnum.COORDINADOR, RolEnum.CEI)
  @ApiOperation({
    summary: 'Crear nuevo Resultado de Aprendizaje',
    description: 'Permite a coordinadores y miembros de la CEI crear un nuevo Resultado de Aprendizaje. Se valida la unicidad del código por tipo y carrera.',
  })
  @ApiBody({
    type: CreateResultadoAprendizajeDto,
    examples: {
      'RA General con código manual': {
        summary: 'RA General con código específico',
        description: 'Ejemplo de creación de un RA de tipo GENERAL con código proporcionado',
        value: {
          codigo: 'RA1',
          descripcion: 'Analizar y sintetizar problemas complejos de ingeniería aplicando principios de matemáticas, ciencias naturales e ingeniería.',
          tipo: 'GENERAL',
          carreraId: 1,
        },
      },
      'RA Específico auto-generado': {
        summary: 'RA Específico con código automático',
        description: 'Ejemplo de creación de un RA de tipo ESPECIFICO sin código (se genera automáticamente como RAE1, RAE2, etc.)',
        value: {
          descripcion: 'Diseñar y desarrollar sistemas de software aplicando metodologías ágiles y principios de ingeniería de software.',
          tipo: 'ESPECIFICO',
          carreraId: 1,
        },
      },
      'RA General auto-generado': {
        summary: 'RA General con código automático',
        description: 'Ejemplo sin código proporcionado (se genera automáticamente como RA1, RA2, etc.)',
        value: {
          descripcion: 'Aplicar conocimientos de matemáticas, ciencias naturales, ciencias de la ingeniería y especialización para resolver problemas complejos de ingeniería.',
          tipo: 'GENERAL',
          carreraId: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Resultado de Aprendizaje creado exitosamente',
    type: ResultadoAprendizajeResponseDto,
    content: {
      'application/json': {
        example: {
          id: 1,
          codigo: 'RA1',
          descripcion: 'Analizar y sintetizar problemas complejos de ingeniería aplicando principios de matemáticas, ciencias naturales e ingeniería.',
          tipo: 'GENERAL',
          carreraId: 1,
          createdAt: '2025-10-13T05:05:36.333Z',
          updatedAt: '2025-10-13T05:05:36.333Z',
        },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Datos de entrada inválidos',
    content: {
      'application/json': {
        examples: {
          'Código vacío': {
            summary: 'Error cuando el código está vacío',
            value: {
              message: ['El código es obligatorio'],
              error: 'Bad Request',
              statusCode: 400,
            },
          },
          'Tipo inválido': {
            summary: 'Error cuando el tipo no es válido',
            value: {
              message: ['El tipo debe ser GENERAL o ESPECIFICO'],
              error: 'Bad Request',
              statusCode: 400,
            },
          },
        },
      },
    },
  })
  @ApiNotFoundResponse({
    description: 'Carrera no encontrada',
    content: {
      'application/json': {
        example: {
          message: 'La carrera especificada no existe',
          error: 'Not Found',
          statusCode: 404,
        },
      },
    },
  })
  @ApiConflictResponse({
    description: 'Código duplicado para el mismo tipo y carrera',
    content: {
      'application/json': {
        example: {
          message: 'Ya existe un Resultado de Aprendizaje con el código "RA1" de tipo "GENERAL" para esta carrera',
          error: 'Conflict',
          statusCode: 409,
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'No autorizado - Token JWT inválido o rol insuficiente',
  })
  @ApiInternalServerErrorResponse({
    description: 'Error interno del servidor',
    content: {
      'application/json': {
        example: {
          message: 'Error interno del servidor al crear el Resultado de Aprendizaje',
          error: 'Internal Server Error',
          statusCode: 500,
        },
      },
    },
  })
  async create(
    @Body() createRaDto: CreateResultadoAprendizajeDto,
    @GetUser() user: UsuarioModel,
  ): Promise<ResultadoAprendizajeResponseDto> {
    const ra = await this.resultadosAprendizajeService.create(createRaDto, user.id);
    
    return {
      id: ra.id,
      codigo: ra.codigo,
      descripcion: ra.descripcion,
      tipo: ra.tipo,
      carreraId: ra.carreraId,
      createdAt: ra.createdAt,
      updatedAt: ra.updatedAt,
    };
  }

  @Get()
  @Roles(RolEnum.COORDINADOR, RolEnum.CEI, RolEnum.PROFESOR)
  @ApiOperation({
    summary: 'Listar Resultados de Aprendizaje con filtros y paginación',
    description: 'Obtiene una lista paginada de Resultados de Aprendizaje con capacidad de filtrado por código, descripción, tipo y carrera.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista paginada de Resultados de Aprendizaje obtenida exitosamente',
    type: ResultadoAprendizajePaginatedResponseDto,
    content: {
      'application/json': {
        example: {
          data: [
            {
              id: 1,
              codigo: 'RA1',
              descripcion: 'Analizar y sintetizar problemas complejos de ingeniería',
              tipo: 'GENERAL',
              carreraId: 1,
              createdAt: '2025-10-13T05:05:36.333Z',
              updatedAt: '2025-10-13T05:05:36.333Z',
            },
            {
              id: 2,
              codigo: 'RAE1',
              descripcion: 'Diseñar y desarrollar sistemas de software',
              tipo: 'ESPECIFICO',
              carreraId: 1,
              createdAt: '2025-10-13T05:06:36.333Z',
              updatedAt: '2025-10-13T05:06:36.333Z',
            },
          ],
          total: 15,
          page: 1,
          limit: 10,
          totalPages: 2,
          hasPrevious: false,
          hasNext: true,
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'No autorizado - Token JWT inválido',
  })
  async findAll(@Query() filterDto: FilterResultadoAprendizajeDto): Promise<ResultadoAprendizajePaginatedResponseDto> {
    const result = await this.resultadosAprendizajeService.findAllWithFiltersAndPagination(filterDto);
    
    return {
      data: result.data.map(ra => ({
        id: ra.id,
        codigo: ra.codigo,
        descripcion: ra.descripcion,
        tipo: ra.tipo,
        carreraId: ra.carreraId,
        createdAt: ra.createdAt,
        updatedAt: ra.updatedAt,
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      hasPrevious: result.hasPrevious,
      hasNext: result.hasNext,
    };
  }

  @Patch(':id')
  @Roles(RolEnum.COORDINADOR, RolEnum.CEI)
  @ApiOperation({
    summary: 'Actualizar Resultado de Aprendizaje',
    description: 'Actualiza los datos de un Resultado de Aprendizaje existente.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'ID del Resultado de Aprendizaje a actualizar',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Resultado de Aprendizaje actualizado exitosamente',
    type: ResultadoAprendizajeResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Datos de entrada inválidos',
  })
  @ApiNotFoundResponse({
    description: 'Resultado de Aprendizaje no encontrado',
  })
  @ApiConflictResponse({
    description: 'Código duplicado para el mismo tipo y carrera',
  })
  @ApiUnauthorizedResponse({
    description: 'No autorizado - Token JWT inválido o rol insuficiente',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRaDto: UpdateResultadoAprendizajeDto,
    @GetUser() user: UsuarioModel,
  ): Promise<ResultadoAprendizajeResponseDto> {
    const ra = await this.resultadosAprendizajeService.update(id, updateRaDto, user.id);

    return {
      id: ra.id,
      codigo: ra.codigo,
      descripcion: ra.descripcion,
      tipo: ra.tipo,
      carreraId: ra.carreraId,
      createdAt: ra.createdAt,
      updatedAt: ra.updatedAt,
    };
  }

  @Delete(':id')
  @Roles(RolEnum.COORDINADOR, RolEnum.CEI)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar Resultado de Aprendizaje',
    description: 'Elimina un Resultado de Aprendizaje del sistema.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'ID del Resultado de Aprendizaje a eliminar',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Resultado de Aprendizaje eliminado exitosamente',
  })
  @ApiNotFoundResponse({
    description: 'Resultado de Aprendizaje no encontrado',
  })
  @ApiUnauthorizedResponse({
    description: 'No autorizado - Token JWT inválido o rol insuficiente',
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: UsuarioModel,
  ): Promise<void> {
    return this.resultadosAprendizajeService.remove(id, user.id);
  }
}