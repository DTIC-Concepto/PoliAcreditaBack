import { Controller, Post, Get, Body, Query, UseGuards, Req, Patch, Delete, Param, ParseIntPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery, ApiParam, ApiBadRequestResponse, ApiNotFoundResponse, ApiConflictResponse } from '@nestjs/swagger';
import { OppService } from './opp.service';
import { CreateOppDto } from './dto/create-opp.dto';
import { UpdateOppDto } from './dto/update-opp.dto';
import { FilterOppDto } from './dto/filter-opp.dto';
import { OppResponseDto } from './dto/opp-response.dto';
import { OppPaginatedResponseDto } from './dto/opp-paginated-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolEnum } from '../common/enums/rol.enum';
import type { Request } from 'express';

@ApiTags('Objetivos de Programa (OPP)')
@Controller('program-objectives')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OppController {
  constructor(private readonly oppService: OppService) {}

  @Get()
  //@Roles(RolEnum.COORDINADOR) // Solo coordinadores pueden ver OPPs
  @ApiOperation({
    summary: 'Listar Objetivos de Programa (OPP)',
    description: 'Permite a los coordinadores visualizar, buscar y paginar los Objetivos de Programa',
  })
  @ApiQuery({
    name: 'search',
    description: 'Filtrar por código o descripción del OPP',
    required: false,
    type: String,
    example: 'OPP1',
  })
  @ApiQuery({
    name: 'page',
    description: 'Número de página (empezando desde 1)',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    description: 'Cantidad de elementos por página',
    required: false,
    type: Number,
    example: 10,
  })
  @ApiQuery({
    name: 'carreraId',
    description: 'Filtrar por ID de carrera',
    required: false,
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de Objetivos de Programa obtenida exitosamente',
    type: OppPaginatedResponseDto,
    content: {
      'application/json': {
        examples: {
          'Lista completa': {
            summary: 'Respuesta completa con paginación',
            value: {
              data: [
                {
                  id: 1,
                  codigo: 'OPP1',
                  descripcion: 'Comprender los principios fundamentales de la ingeniería de software.',
                  carreraId: 1,
                  createdAt: '2025-10-13T05:05:36.333Z',
                  updatedAt: '2025-10-13T05:05:36.333Z',
                },
                {
                  id: 2,
                  codigo: 'OPP2',
                  descripcion: 'Desarrollar habilidades para el análisis y diseño de sistemas.',
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
          'Búsqueda filtrada': {
            summary: 'Resultado de búsqueda por "OPP1"',
            value: {
              data: [
                {
                  id: 1,
                  codigo: 'OPP1',
                  descripcion: 'Comprender los principios fundamentales de la ingeniería de software.',
                  carreraId: 1,
                  createdAt: '2025-10-13T05:05:36.333Z',
                  updatedAt: '2025-10-13T05:05:36.333Z',
                },
              ],
              total: 1,
              page: 1,
              limit: 10,
              totalPages: 1,
              hasPrevious: false,
              hasNext: false,
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token JWT inválido o expirado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Solo coordinadores pueden ver OPPs',
  })
  async findAll(@Query() filters: FilterOppDto): Promise<OppPaginatedResponseDto> {
    const result = await this.oppService.findAllWithFiltersAndPagination(filters);
    
    return {
      data: result.data.map(opp => ({
        id: opp.id,
        codigo: opp.codigo,
        descripcion: opp.descripcion,
        carreraId: opp.carreraId,
        createdAt: opp.createdAt,
        updatedAt: opp.updatedAt,
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      hasPrevious: result.hasPrevious,
      hasNext: result.hasNext,
    };
  }

  @Post()
  @Roles(RolEnum.COORDINADOR) // Solo coordinadores pueden crear OPPs
  @ApiOperation({
    summary: 'Crear un nuevo Objetivo de Programa (OPP)',
    description: 'Permite a los coordinadores crear un nuevo Objetivo de Programa con código único por carrera',
  })
  @ApiBody({
    type: CreateOppDto,
    examples: {
      'Ejemplo OPP1': {
        summary: 'Objetivo de Programa básico',
        description: 'Ejemplo de creación de un OPP con código OPP1',
        value: {
          codigo: 'OPP1',
          descripcion: 'Comprender los principios fundamentales de la ingeniería de software.',
          carreraId: 1,
        },
      },
      'Ejemplo OPP6': {
        summary: 'Otro Objetivo de Programa',
        description: 'Ejemplo de creación de un OPP con código OPP6',
        value: {
          codigo: 'OPP6',
          descripcion: 'Desarrollar habilidades para el análisis y diseño de sistemas de información.',
          carreraId: 1,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Objetivo de Programa creado exitosamente',
    type: OppResponseDto,
    content: {
      'application/json': {
        example: {
          id: 1,
          codigo: 'OPP1',
          descripcion: 'Comprender los principios fundamentales de la ingeniería de software.',
          carreraId: 1,
          createdAt: '2025-10-13T05:05:36.333Z',
          updatedAt: '2025-10-13T05:05:36.333Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
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
          'Descripción vacía': {
            summary: 'Error cuando la descripción está vacía',
            value: {
              message: ['La descripción es obligatoria'],
              error: 'Bad Request',
              statusCode: 400,
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
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
  @ApiResponse({
    status: 409,
    description: 'Código duplicado para la carrera',
    content: {
      'application/json': {
        example: {
          message: 'Ya existe un Objetivo de Programa con este código para esta carrera',
          error: 'Conflict',
          statusCode: 409,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - Token JWT inválido o expirado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Solo coordinadores pueden crear OPPs',
  })
  async create(
    @Body() createOppDto: CreateOppDto,
    @Req() req: Request,
  ): Promise<OppResponseDto> {
    const usuarioId = (req.user as any).id;
    const opp = await this.oppService.create(createOppDto, usuarioId);
    
    return {
      id: opp.id,
      codigo: opp.codigo,
      descripcion: opp.descripcion,
      carreraId: opp.carreraId,
      createdAt: opp.createdAt,
      updatedAt: opp.updatedAt,
    };
  }

  @Patch(':id')
  @Roles(RolEnum.COORDINADOR, RolEnum.CEI)
  @ApiOperation({
    summary: 'Actualizar Objetivo de Programa',
    description: 'Actualiza los datos de un Objetivo de Programa existente.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'ID del Objetivo de Programa a actualizar',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Objetivo de Programa actualizado exitosamente',
    type: OppResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Datos de entrada inválidos',
  })
  @ApiNotFoundResponse({
    description: 'Objetivo de Programa no encontrado',
  })
  @ApiConflictResponse({
    description: 'Código duplicado para la carrera',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOppDto: UpdateOppDto,
    @Req() req: Request,
  ): Promise<OppResponseDto> {
    const usuarioId = (req.user as any).id;
    const opp = await this.oppService.update(id, updateOppDto, usuarioId);

    return {
      id: opp.id,
      codigo: opp.codigo,
      descripcion: opp.descripcion,
      carreraId: opp.carreraId,
      createdAt: opp.createdAt,
      updatedAt: opp.updatedAt,
    };
  }

  @Delete(':id')
  @Roles(RolEnum.COORDINADOR, RolEnum.CEI)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar Objetivo de Programa',
    description: 'Elimina un Objetivo de Programa del sistema.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'ID del Objetivo de Programa a eliminar',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Objetivo de Programa eliminado exitosamente',
  })
  @ApiNotFoundResponse({
    description: 'Objetivo de Programa no encontrado',
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request,
  ): Promise<void> {
    const usuarioId = (req.user as any).id;
    return this.oppService.remove(id, usuarioId);
  }
}