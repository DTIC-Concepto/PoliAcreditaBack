import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsArray, IsEnum, IsNumber } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { NivelAporteEnum } from '../../common/enums/nivel-aporte.enum';

export class MatrizAsignaturasEuraceQueryDto {
  @ApiProperty({
    description: 'Filtrar por niveles de aporte (funciona como OR)',
    enum: NivelAporteEnum,
    isArray: true,
    required: false,
    example: ['Alto', 'Medio'],
  })
  @IsOptional()
  @Transform(({ value }) => {
    // Si es un string, convertirlo en array
    if (typeof value === 'string') {
      return [value];
    }
    // Si ya es un array, devolverlo tal cual
    return value;
  })
  @IsArray()
  @IsEnum(NivelAporteEnum, { each: true })
  nivelesAporte?: NivelAporteEnum[];

  @ApiProperty({
    description: 'Buscar asignaturas por código o nombre (búsqueda parcial, case-insensitive)',
    type: String,
    required: false,
    example: 'MATD',
  })
  @IsOptional()
  search?: string;
}

export class EurAceInfoDto {
  @ApiProperty({ description: 'ID del criterio EUR-ACE', example: 1 })
  id: number;

  @ApiProperty({ description: 'Código del criterio EUR-ACE', example: '5.2.1' })
  codigo: string;

  @ApiProperty({
    description: 'Descripción del criterio EUR-ACE',
    example: 'Conocimiento y comprensión de matemáticas y otras ciencias aplicables a su rama de ingeniería',
  })
  descripcion: string;
}

export class RelacionEurAceDto {
  @ApiProperty({
    description: 'Indica si existe relación entre la asignatura y el criterio EUR-ACE',
    example: true,
  })
  tieneRelacion: boolean;

  @ApiProperty({
    description: 'Niveles de aporte encontrados en la relación',
    enum: NivelAporteEnum,
    isArray: true,
    example: ['Alto', 'Medio'],
  })
  nivelesAporte: NivelAporteEnum[];

  @ApiProperty({
    description: 'Cantidad de RAAs que relacionan esta asignatura con el criterio EUR-ACE',
    example: 3,
  })
  cantidadRAAs: number;
}

export class AsignaturaMatrizDto {
  @ApiProperty({ description: 'ID de la asignatura', example: 1 })
  id: number;

  @ApiProperty({ description: 'Código de la asignatura', example: 'ISWD414' })
  codigo: string;

  @ApiProperty({
    description: 'Nombre de la asignatura',
    example: 'Ingeniería de Software y Requerimientos',
  })
  nombre: string;

  @ApiProperty({
    description: 'Mapa de relaciones con EUR-ACE, indexado por eurAceId',
    example: {
      '1': {
        tieneRelacion: true,
        nivelesAporte: ['Alto', 'Medio'],
        cantidadRAAs: 3,
      },
    },
  })
  relaciones: Record<number, RelacionEurAceDto>;
}

export class AsignaturaSimpleDto {
  @ApiProperty({ description: 'ID de la asignatura', example: 1 })
  id: number;

  @ApiProperty({ description: 'Código de la asignatura', example: 'MATD123' })
  code: string;

  @ApiProperty({
    description: 'Nombre de la asignatura',
    example: 'Cálculo en una Variable',
  })
  name: string;

  @ApiProperty({
    description: 'Descripción de la asignatura',
    example: 'Asignatura que cubre conceptos fundamentales...',
  })
  description: string;

  @ApiProperty({ description: 'Estado activo', example: true })
  active: boolean;
}

export class EurAceSimpleDto {
  @ApiProperty({ description: 'ID del criterio EUR-ACE', example: 1 })
  id: number;

  @ApiProperty({ description: 'Código del criterio EUR-ACE', example: '5.2.1' })
  code: string;

  @ApiProperty({
    description: 'Nombre/Descripción del criterio EUR-ACE',
    example: 'Conocimiento y comprensión...',
  })
  name: string;

  @ApiProperty({
    description: 'Descripción completa del criterio EUR-ACE',
    example: 'Conocimiento y comprensión de matemáticas...',
  })
  description: string;

  @ApiProperty({ description: 'Estado activo', example: true })
  active: boolean;
}

export class MappingMatrizDto {
  @ApiProperty({ description: 'ID de la asignatura', example: 1 })
  asignaturaId: number;

  @ApiProperty({ description: 'ID del criterio EUR-ACE', example: 1 })
  eurAceId: number;

  @ApiProperty({ description: 'Indica si existe relación', example: true })
  hasMapping: boolean;

  @ApiProperty({
    description: 'Niveles de aporte encontrados',
    type: [String],
    example: ['Alto', 'Medio'],
  })
  nivelesAporte: string[];

  @ApiProperty({
    description: 'Cantidad de RAAs que relacionan',
    example: 3,
  })
  cantidadRAAs: number;
}

export class MatrizStatsDto {
  @ApiProperty({ description: 'Total de asignaturas', example: 10 })
  totalAsignaturas: number;

  @ApiProperty({ description: 'Total de criterios EUR-ACE', example: 13 })
  totalEurAce: number;

  @ApiProperty({
    description: 'Total de relaciones encontradas',
    example: 25,
  })
  totalMappings: number;

  @ApiProperty({
    description: 'Porcentaje de cobertura',
    example: 19.23,
  })
  coveragePercentage: number;
}

export class MatrizAsignaturasEuraceResponseDto {
  @ApiProperty({
    description: 'Lista de asignaturas',
    type: [AsignaturaSimpleDto],
  })
  asignaturas: AsignaturaSimpleDto[];

  @ApiProperty({
    description: 'Lista de criterios EUR-ACE',
    type: [EurAceSimpleDto],
  })
  eurAceCriteria: EurAceSimpleDto[];

  @ApiProperty({
    description: 'Matriz de relaciones',
    type: [MappingMatrizDto],
  })
  mappings: MappingMatrizDto[];

  @ApiProperty({ description: 'ID de la carrera', example: 1 })
  programId: number;

  @ApiProperty({
    description: 'Nombre de la carrera',
    example: 'Ingeniería de Software',
  })
  programName: string;

  @ApiProperty({
    description: 'Estadísticas de la matriz',
    type: MatrizStatsDto,
  })
  stats: MatrizStatsDto;
}
