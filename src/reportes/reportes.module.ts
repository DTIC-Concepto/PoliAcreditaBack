import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';
import { CarreraAsignaturaModel } from '../asignaturas/models/carrera-asignatura.model';
import { AsignaturaModel } from '../asignaturas/models/asignatura.model';
import { RaaModel } from '../raa/models/raa.model';
import { RaaRaModel } from '../mappings/models/raa-ra.model';
import { RaEuraceModel } from '../mappings/models/ra-eurace.model';
import { RaOppModel } from '../mappings/models/ra-opp.model';
import { ResultadoAprendizajeModel } from '../resultados-aprendizaje/models/resultado-aprendizaje.model';
import { EurAceModel } from '../eur-ace/models/eur-ace.model';
import { OppModel } from '../opp/models/opp.model';
import { CarreraModel } from '../carreras/models/carrera.model';

@Module({
  imports: [
    SequelizeModule.forFeature([
      CarreraAsignaturaModel,
      AsignaturaModel,
      RaaModel,
      RaaRaModel,
      RaEuraceModel,
      RaOppModel,
      ResultadoAprendizajeModel,
      EurAceModel,
      OppModel,
      CarreraModel,
    ]),
  ],
  controllers: [ReportesController],
  providers: [ReportesService],
  exports: [ReportesService],
})
export class ReportesModule {}
