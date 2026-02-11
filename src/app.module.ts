import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Módulos de la aplicación
import { UsuariosModule } from './usuarios/usuarios.module';
import { AuthModule } from './auth/auth.module';
import { FacultadesModule } from './facultades/facultades.module';
import { CarrerasModule } from './carreras/carreras.module';
import { AsignaturasModule } from './asignaturas/asignaturas.module';
import { RaaModule } from './raa/raa.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuditoriaModule } from './auditoria/auditoria.module';
import { RolesModule } from './roles/roles.module';
import { EurAceModule } from './eur-ace/eur-ace.module';
import { OppModule } from './opp/opp.module';
import { ResultadosAprendizajeModule } from './resultados-aprendizaje/resultados-aprendizaje.module';
import { MappingsModule } from './mappings/mappings.module';
import { ReportesModule } from './reportes/reportes.module';

// Modelos
import { UsuarioModel } from './usuarios/models/usuario.model';
import { UsuarioRolModel } from './common/models/usuario-rol.model';
import { UsuarioCarreraModel } from './common/models/usuario-carrera.model';
import { PermisoModel } from './common/models/permiso.model';
import { RolPermisoModel } from './common/models/rol-permiso.model';
import { FacultadModel } from './facultades/models/facultad.model';
import { CarreraModel } from './carreras/models/carrera.model';
import { AsignaturaModel } from './asignaturas/models/asignatura.model';
import { CarreraAsignaturaModel } from './asignaturas/models/carrera-asignatura.model';
import { RaaModel } from './raa/models/raa.model';
import { AuditoriaEventoModel } from './auditoria/models/auditoria-evento.model';
import { EurAceModel } from './eur-ace/models/eur-ace.model';
import { OppModel } from './opp/models/opp.model';
import { ResultadoAprendizajeModel } from './resultados-aprendizaje/models/resultado-aprendizaje.model';
import { RaOppModel } from './mappings/models/ra-opp.model';
import { RaEuraceModel } from './mappings/models/ra-eurace.model';
import { RaaRaModel } from './mappings/models/raa-ra.model';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    SequelizeModule.forRoot({
      dialect: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || 'postgres',
      database: process.env.DB_NAME || 'poliacredita_db',
      models: [UsuarioModel, UsuarioRolModel, UsuarioCarreraModel, PermisoModel, RolPermisoModel, FacultadModel, CarreraModel, AsignaturaModel, CarreraAsignaturaModel, RaaModel, AuditoriaEventoModel, EurAceModel, OppModel, ResultadoAprendizajeModel, RaOppModel, RaEuraceModel, RaaRaModel],
      autoLoadModels: true,
      synchronize: true,
      // sync: { alter: true }, // Desactivado para evitar errores con ENUMs de PostgreSQL
      logging: false // Desactivar logs SQL para mayor limpieza

    }),
    // Módulos de funcionalidad
    UsuariosModule,
    AuthModule,
    FacultadesModule,
    CarrerasModule,
    AsignaturasModule,
    RaaModule,
    DashboardModule,
    AuditoriaModule,
    RolesModule,
    EurAceModule,
    OppModule,
    ResultadosAprendizajeModule,
    MappingsModule,
    ReportesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
