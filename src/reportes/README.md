# Módulo de Reportes

Este módulo proporciona endpoints para generar reportes de trazabilidad entre asignaturas, RAAs, RAs y criterios EUR-ACE.

## Estructura de Trazabilidad

```
EUR-ACE ← (ra_eurace) → RA ← (raa_ra) → RAA → Asignatura
```

- **EUR-ACE**: Criterios European Accreditation of Engineering Programmes
- **RA**: Resultados de Aprendizaje (de la carrera)
- **RAA**: Resultados de Aprendizaje de Asignatura
- **Asignatura**: Materia específica de la carrera

## Endpoints

### 1. Matriz Asignaturas vs EUR-ACE

**GET** `/reportes/matriz-asignaturas-eurace/:carreraId`

Genera una matriz que muestra todas las asignaturas de una carrera contra todos los criterios EUR-ACE.

**Parámetros:**
- `carreraId` (path, requerido): ID de la carrera

**Query params opcionales:**
- `nivelesAporte`: Array de niveles de aporte para filtrar (`Alto`, `Medio`, `Bajo`)
- `eurAceIds`: Array de IDs de criterios EUR-ACE para filtrar

**Ejemplo de petición:**
```bash
GET /reportes/matriz-asignaturas-eurace/1?nivelesAporte=Alto&nivelesAporte=Medio
```

**Respuesta:**
```json
{
  "eurAces": [
    {
      "id": 1,
      "codigo": "5.2.1",
      "descripcion": "Conocimiento y comprensión..."
    }
  ],
  "asignaturas": [
    {
      "id": 1,
      "codigo": "MATD123",
      "nombre": "Cálculo en una Variable",
      "relaciones": {
        "1": {
          "tieneRelacion": true,
          "nivelesAporte": ["Alto", "Medio"],
          "cantidadRAAs": 3
        }
      }
    }
  ]
}
```

### 2. Trazabilidad Detallada de Asignatura

**GET** `/reportes/trazabilidad-asignatura/:asignaturaId`

Muestra la trazabilidad completa de una asignatura, agrupada por nivel de aporte.

**Parámetros:**
- `asignaturaId` (path, requerido): ID de la asignatura
- `carreraId` (query, requerido): ID de la carrera

**Query params opcionales:**
- `nivelesAporte`: Array de niveles de aporte para filtrar
- `eurAceId`: ID de un criterio EUR-ACE específico

**Ejemplo de petición:**
```bash
GET /reportes/trazabilidad-asignatura/1?carreraId=1&nivelesAporte=Alto
```

**Respuesta:**
```json
{
  "asignatura": {
    "id": 1,
    "codigo": "MATD123",
    "nombre": "Cálculo en una Variable"
  },
  "trazabilidad": {
    "Alto": [
      {
        "raa": {
          "id": 1,
          "codigo": "RAA 1.2",
          "descripcion": "El estudiante será capaz de..."
        },
        "ra": {
          "id": 1,
          "codigo": "RA1",
          "descripcion": "Aplicar teorías, metodologías..."
        },
        "justificacionRaaRa": "La comprensión de funciones...",
        "eurAce": {
          "id": 1,
          "codigo": "5.2.2",
          "descripcion": "Capacidad para demostrar conocimiento..."
        },
        "justificacionRaEurace": "El conocimiento matemático es fundamental..."
      }
    ],
    "Medio": [],
    "Bajo": []
  }
}
```

## Permisos

Los siguientes roles tienen acceso a estos endpoints:
- `CEI`
- `COORDINADOR`
- `DECANO`
- `SUBDECANO`
- `JEFE_DEPARTAMENTO`
- `ADMINISTRADOR`

## Filtros

### Niveles de Aporte

Los filtros por niveles de aporte funcionan con lógica **OR**:
- Si filtras por `Alto` y `Medio`, se mostrarán las relaciones que tengan **al menos uno** de esos niveles.
- Si una relación tiene múltiples niveles (por ejemplo, distintos RAAs con diferentes niveles), se mostrarán **todos** los niveles encontrados.

### Criterios EUR-ACE

Puedes filtrar por criterios EUR-ACE específicos:
- En la matriz: solo se mostrarán las columnas de los criterios seleccionados
- En la trazabilidad: solo se mostrarán las relaciones con el criterio especificado

## Arquitectura

### Modelos involucrados:
- `CarreraAsignaturaModel`: Relación entre carreras y asignaturas
- `AsignaturaModel`: Información de asignaturas
- `RaaModel`: Resultados de Aprendizaje de Asignatura
- `RaaRaModel`: Relación RAA → RA (con nivel de aporte)
- `ResultadoAprendizajeModel`: Resultados de Aprendizaje
- `RaEuraceModel`: Relación RA → EUR-ACE
- `EurAceModel`: Criterios EUR-ACE

### Lógica del servicio:

#### Matriz Asignaturas-EURACE:
1. Obtiene todos los criterios EUR-ACE (con filtro opcional)
2. Obtiene todas las asignaturas de la carrera
3. Para cada asignatura:
   - Obtiene sus RAAs
   - Obtiene las relaciones RAA → RA (con filtro de nivel de aporte)
   - Obtiene las relaciones RA → EUR-ACE
   - Construye un mapa de relaciones por EUR-ACE

#### Trazabilidad de Asignatura:
1. Verifica que la asignatura existe y pertenece a la carrera
2. Obtiene todos los RAAs de la asignatura
3. Obtiene las relaciones RAA → RA (con filtros opcionales)
4. Obtiene las relaciones RA → EUR-ACE (con filtro opcional)
5. Construye items de trazabilidad completos
6. Agrupa por nivel de aporte

## Ejemplos de uso

### Caso 1: Ver todas las relaciones de una carrera
```bash
GET /reportes/matriz-asignaturas-eurace/1
```

### Caso 2: Ver solo relaciones de alto nivel
```bash
GET /reportes/matriz-asignaturas-eurace/1?nivelesAporte=Alto
```

### Caso 3: Ver relaciones con criterios específicos
```bash
GET /reportes/matriz-asignaturas-eurace/1?eurAceIds=1&eurAceIds=2&eurAceIds=3
```

### Caso 4: Trazabilidad completa de una asignatura
```bash
GET /reportes/trazabilidad-asignatura/1?carreraId=1
```

### Caso 5: Trazabilidad de una asignatura para un criterio específico
```bash
GET /reportes/trazabilidad-asignatura/1?carreraId=1&eurAceId=1&nivelesAporte=Alto
```
