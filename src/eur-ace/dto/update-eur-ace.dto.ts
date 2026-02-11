import { PartialType } from '@nestjs/swagger';
import { CreateEurAceDto } from './create-eur-ace.dto';

export class UpdateEurAceDto extends PartialType(CreateEurAceDto) {}
