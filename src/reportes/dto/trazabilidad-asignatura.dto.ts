import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsArray, IsEnum, IsNumber } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { NivelAporteEnum } from '../../common/enums/nivel-aporte.enum';

export class TrazabilidadAsignaturaQueryDto {
  @ApiProperty({
    description: 'ID de la carrera (requerido)',
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  carreraId: number;

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

export class RaaInfoDto {
  @ApiProperty({ description: 'ID del RAA', example: 1 })
  id: number;

  @ApiProperty({
    description: 'Código del RAA',
    example: 'RAA 1.2',
  })
  codigo: string;

  @ApiProperty({
    description: 'Descripción del RAA',
    example: 'El estudiante será capaz de reconocer dominios, rangos...',
  })
  descripcion: string;
}

export class RaInfoDto {
  @ApiProperty({ description: 'ID del RA', example: 1 })
  id: number;

  @ApiProperty({
    description: 'Código del RA',
    example: 'RA1',
  })
  codigo: string;

  @ApiProperty({
    description: 'Descripción del RA',
    example: 'Aplicar teorías, metodologías...',
  })
  descripcion: string;
}

export class EurAceDetalleDto {
  @ApiProperty({ description: 'ID del criterio EUR-ACE', example: 1 })
  id: number;

  @ApiProperty({ description: 'Código del criterio EUR-ACE', example: '5.2.2' })
  codigo: string;

  @ApiProperty({
    description: 'Descripción del criterio EUR-ACE',
    example: 'Capacidad para demostrar conocimiento y comprensión de matemáticas y otras ciencias aplicables a su rama de ingeniería',
  })
  descripcion: string;
}

export class TrazabilidadItemDto {
  @ApiProperty({
    description: 'Información del RAA',
    type: RaaInfoDto,
  })
  raa: RaaInfoDto;

  @ApiProperty({
    description: 'Información del RA',
    type: RaInfoDto,
  })
  ra: RaInfoDto;

  @ApiProperty({
    description: 'Justificación de la relación entre RAA y RA',
    example: 'La comprensión de funciones y límites es base...',
  })
  justificacionRaaRa: string;

  @ApiProperty({
    description: 'Información del criterio EUR-ACE',
    type: EurAceDetalleDto,
  })
  eurAce: EurAceDetalleDto;

  @ApiProperty({
    description: 'Justificación de la relación entre RA y EUR-ACE',
    example: 'El conocimiento matemático es fundamental...',
  })
  justificacionRaEurace: string;
}

export class AsignaturaInfoDto {
  @ApiProperty({ description: 'ID de la asignatura', example: 1 })
  id: number;

  @ApiProperty({ description: 'Código de la asignatura', example: 'MATD123' })
  codigo: string;

  @ApiProperty({
    description: 'Nombre de la asignatura',
    example: 'Cálculo en una Variable',
  })
  nombre: string;
}

export class TrazabilidadAsignaturaResponseDto {
  @ApiProperty({
    description: 'Información de la asignatura',
    type: AsignaturaInfoDto,
  })
  asignatura: AsignaturaInfoDto;

  @ApiProperty({
    description: 'Trazabilidad agrupada por nivel de aporte',
    example: {
      Alto: [
        {
          raa: { id: 1, codigo: 'RAA 1.2', descripcion: '...' },
          ra: { id: 1, codigo: 'RA1', descripcion: '...' },
          justificacionRaaRa: '...',
          eurAce: { id: 1, codigo: '5.2.2', nombre: '...', descripcion: '...' },
          justificacionRaEurace: '...',
        },
      ],
      Medio: [],
      Bajo: [],
    },
  })
  trazabilidad: Record<string, TrazabilidadItemDto[]>;
}
