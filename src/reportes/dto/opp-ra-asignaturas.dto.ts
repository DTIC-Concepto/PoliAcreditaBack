import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsArray, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';
import { NivelAporteEnum } from '../../common/enums/nivel-aporte.enum';

export class OppRaAsignaturasQueryDto {
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
}

export class OppInfoDto {
  @ApiProperty({ description: 'ID del OPP', example: 1 })
  id: number;

  @ApiProperty({ description: 'Código del OPP', example: 'OPP1' })
  codigo: string;

  @ApiProperty({
    description: 'Descripción del OPP',
    example: 'Formar profesionales capaces de analizar...',
  })
  descripcion: string;
}

export class RaInfoSimpleDto {
  @ApiProperty({ description: 'ID del RA', example: 1 })
  id: number;

  @ApiProperty({ description: 'Código del RA', example: 'RG1' })
  codigo: string;

  @ApiProperty({
    description: 'Descripción del RA',
    example: 'Identifica y aplica algoritmos de optimización...',
  })
  descripcion: string;
}

export class AsignaturaConNivelDto {
  @ApiProperty({ description: 'ID de la asignatura', example: 1 })
  id: number;

  @ApiProperty({ description: 'Código de la asignatura', example: 'IS-101' })
  codigo: string;

  @ApiProperty({
    description: 'Nombre de la asignatura',
    example: 'Programación Avanzada',
  })
  nombre: string;

  @ApiProperty({
    description: 'Nivel de aporte del RA a esta asignatura',
    enum: NivelAporteEnum,
    example: NivelAporteEnum.ALTO,
  })
  nivelAporte: NivelAporteEnum;
}

export class RaConAsignaturasDto {
  @ApiProperty({
    description: 'Información del Resultado de Aprendizaje',
    type: RaInfoSimpleDto,
  })
  ra: RaInfoSimpleDto;

  @ApiProperty({
    description: 'Lista de asignaturas asociadas a este RA con su nivel de aporte',
    type: [AsignaturaConNivelDto],
  })
  asignaturas: AsignaturaConNivelDto[];
}

export class OppConRaYAsignaturasDto {
  @ApiProperty({
    description: 'Información del OPP',
    type: OppInfoDto,
  })
  opp: OppInfoDto;

  @ApiProperty({
    description: 'Lista de RAs relacionados con el OPP y sus asignaturas',
    type: [RaConAsignaturasDto],
  })
  resultadosAprendizaje: RaConAsignaturasDto[];
}

export class OppRaAsignaturasResponseDto {
  @ApiProperty({ description: 'ID de la carrera', example: 1 })
  carreraId: number;

  @ApiProperty({
    description: 'Nombre de la carrera',
    example: 'Ingeniería de Software',
  })
  carreraNombre: string;

  @ApiProperty({
    description: 'Lista de OPPs con sus RAs y asignaturas asociadas',
    type: [OppConRaYAsignaturasDto],
  })
  opps: OppConRaYAsignaturasDto[];
}
