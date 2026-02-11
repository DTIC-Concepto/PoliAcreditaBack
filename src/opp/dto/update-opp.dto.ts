import { PartialType } from '@nestjs/swagger';
import { CreateOppDto } from './create-opp.dto';

export class UpdateOppDto extends PartialType(CreateOppDto) {}
