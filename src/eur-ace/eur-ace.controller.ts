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
  ApiInternalServerErrorResponse,
  ApiParam,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { UpdateEurAceDto } from './dto/update-eur-ace.dto';
import { EurAceService } from './eur-ace.service';
import { CreateEurAceDto } from './dto/create-eur-ace.dto';
import { EurAceResponseDto } from './dto/eur-ace-response.dto';
import { FilterEurAceDto } from './dto/filter-eur-ace.dto';
import { EurAcePaginatedResponseDto } from './dto/eur-ace-paginated-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { UsuarioModel } from '../usuarios/models/usuario.model';
import { RolEnum } from '../common/enums/rol.enum';

@ApiTags('EUR-ACE Criteria')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('eur-ace-criteria')
export class EurAceController {
  constructor(private readonly eurAceService: EurAceService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles(RolEnum.CEI)
  @ApiOperation({
    summary: 'Crear nuevo criterio EUR-ACE',
    description: 'Permite a un miembro de la CEI agregar un nuevo criterio EUR-ACE al sistema. Se valida la unicidad del código y todos los campos obligatorios.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Criterio EUR-ACE creado exitosamente',
    type: EurAceResponseDto,
    example: {
      id: 1,
      codigo: '5.4.6',
      descripcion: 'Gestión de proyectos de ingeniería complejos aplicando metodologías modernas, considerando restricciones técnicas, económicas y de recursos humanos.',
      createdAt: '2025-10-12T18:30:00.000Z',
      updatedAt: '2025-10-12T18:30:00.000Z',
    },
  })
  @ApiBadRequestResponse({
    description: 'Datos de entrada inválidos - campos obligatorios faltantes',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'array',
          items: { type: 'string' },
          example: ['El código es obligatorio', 'La descripción es obligatoria'],
        },
        error: { type: 'string', example: 'Bad Request' },
        statusCode: { type: 'number', example: 400 },
      },
    },
  })
  @ApiConflictResponse({
    description: 'Código del criterio EUR-ACE ya existe',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Ya existe un criterio EUR-ACE con el código "5.4.6"',
        },
        error: { type: 'string', example: 'Conflict' },
        statusCode: { type: 'number', example: 409 },
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Error interno del servidor',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Error interno del servidor al crear el criterio EUR-ACE',
        },
        error: { type: 'string', example: 'Internal Server Error' },
        statusCode: { type: 'number', example: 500 },
      },
    },
  })
  async create(
    @Body() createEurAceDto: CreateEurAceDto,
    @GetUser() user: UsuarioModel,
  ): Promise<EurAceResponseDto> {
    const criterio = await this.eurAceService.create(createEurAceDto, user.id);
    
    return {
      id: criterio.id,
      codigo: criterio.codigo,
      descripcion: criterio.descripcion,
      createdAt: criterio.createdAt,
      updatedAt: criterio.updatedAt,
    };
  }

  @Get()
  @Roles(RolEnum.CEI, RolEnum.ADMINISTRADOR, RolEnum.DECANO, RolEnum.COORDINADOR, RolEnum.PROFESOR)
  @ApiOperation({
    summary: 'Listar criterios EUR-ACE con filtros y paginación',
    description: 'Obtiene una lista paginada de criterios EUR-ACE con capacidad de filtrado por código y descripción. Solo accesible para usuarios con rol CEI.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista paginada de criterios EUR-ACE obtenida exitosamente',
    type: EurAcePaginatedResponseDto,
    example: {
      data: [
        {
          id: 1,
          codigo: '5.4.1',
          descripcion: 'Análisis y síntesis de problemas complejos de ingeniería',
          createdAt: '2025-10-12T18:30:00.000Z',
          updatedAt: '2025-10-12T18:30:00.000Z',
        },
        {
          id: 2,
          codigo: '5.4.6',
          descripcion: 'Gestión de proyectos de ingeniería complejos aplicando metodologías modernas',
          createdAt: '2025-10-12T18:31:00.000Z',
          updatedAt: '2025-10-12T18:31:00.000Z',
        },
      ],
      total: 15,
      page: 1,
      limit: 10,
      totalPages: 2,
      hasPrevious: false,
      hasNext: true,
    },
  })
  async findAll(@Query() filterDto: FilterEurAceDto): Promise<EurAcePaginatedResponseDto> {
    const result = await this.eurAceService.findAllWithFiltersAndPagination(filterDto);
    
    return {
      data: result.data.map(criterio => ({
        id: criterio.id,
        codigo: criterio.codigo,
        descripcion: criterio.descripcion,
        createdAt: criterio.createdAt,
        updatedAt: criterio.updatedAt,
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
  @Roles(RolEnum.CEI)
  @ApiOperation({
    summary: 'Actualizar criterio EUR-ACE',
    description: 'Actualiza los datos de un criterio EUR-ACE existente.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'ID del criterio EUR-ACE a actualizar',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Criterio EUR-ACE actualizado exitosamente',
    type: EurAceResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Datos de entrada inválidos',
  })
  @ApiNotFoundResponse({
    description: 'Criterio EUR-ACE no encontrado',
  })
  @ApiConflictResponse({
    description: 'Código duplicado',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEurAceDto: UpdateEurAceDto,
    @GetUser() user: UsuarioModel,
  ): Promise<EurAceResponseDto> {
    const criterio = await this.eurAceService.update(id, updateEurAceDto, user.id);

    return {
      id: criterio.id,
      codigo: criterio.codigo,
      descripcion: criterio.descripcion,
      createdAt: criterio.createdAt,
      updatedAt: criterio.updatedAt,
    };
  }

  @Delete(':id')
  @Roles(RolEnum.CEI)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Eliminar criterio EUR-ACE',
    description: 'Elimina un criterio EUR-ACE del sistema.',
  })
  @ApiParam({
    name: 'id',
    type: 'number',
    description: 'ID del criterio EUR-ACE a eliminar',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Criterio EUR-ACE eliminado exitosamente',
  })
  @ApiNotFoundResponse({
    description: 'Criterio EUR-ACE no encontrado',
  })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @GetUser() user: UsuarioModel,
  ): Promise<void> {
    return this.eurAceService.remove(id, user.id);
  }
}