import { PartialType } from '@nestjs/swagger';
import { CreateResultadoAprendizajeDto } from './create-resultado-aprendizaje.dto';

export class UpdateResultadoAprendizajeDto extends PartialType(CreateResultadoAprendizajeDto) {}
