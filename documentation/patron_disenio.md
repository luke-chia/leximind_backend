# 🏗️ Patrones de Diseño del Proyecto Backend 
## 📋 Resumen Ejecutivo

Este proyecto implementa una **Arquitectura Hexagonal (Ports and Adapters)** combinada con principios **SOLID**, siguiendo las mejores prácticas de **Clean Architecture**.

---

## 🎯 Patrón Principal: Arquitectura Hexagonal

### 🔍 ¿Qué es la Arquitectura Hexagonal?

La Arquitectura Hexagonal, también conocida como **Ports and Adapters**, es un patrón arquitectónico que:

- 🎯 **Aísla la lógica de negocio** del mundo exterior
- 🔌 **Usa puertos (interfaces)** para definir contratos
- 🔧 **Implementa adaptadores** para conectar con sistemas externos
- 🛡️ **Protege el dominio** de cambios en infraestructura

---

## 🏛️ Estructura de Capas

### 1. 🧠 Domain Layer (`src/domain/`)

> **Propósito**: Contiene la lógica de negocio pura, independiente de cualquier tecnología externa.

#### 📁 Componentes:

- **🏷️ Entities**: 
  - `UserEntity` - Objetos de dominio puros
  - Representan conceptos del negocio

- **🔌 Repositories**: 
  - `AuthRepository` (abstract) - Puertos/Interfaces
  - Define contratos para acceso a datos

- **📡 Datasources**: 
  - `AuthDatasource` (abstract) - Puertos/Interfaces
  - Abstrae fuentes de datos externas

- **📦 DTOs**: 
  - `RegisterUserDto` - Objetos de transferencia de datos
  - Validación y estructura de entrada

- **⚠️ Errors**: 
  - `CustomError` - Errores específicos del dominio
  - Manejo centralizado de excepciones

### 2. 🔧 Infrastructure Layer (`src/infrastructure/`)

> **Propósito**: Implementa los adaptadores que conectan el dominio con sistemas externos.

#### 📁 Componentes:

- **🗄️ Repositories**: 
  - `AuthRepositoryImpl` - Adaptadores que implementan los puertos
  - Conecta lógica de negocio con fuentes de datos

- **📊 Datasources**: 
  - `AuthDatasourceImpl` - Adaptadores para fuentes de datos
  - Implementaciones específicas de acceso a datos

- **🔄 Mappers**: 
  - Transforman datos entre capas
  - Mantienen separación de responsabilidades

### 3. 🎨 Presentation Layer (`src/presentation/`)

> **Propósito**: Maneja la interfaz de usuario y comunicación externa.

#### 📁 Componentes:

- **🎮 Controllers**: 
  - `AuthController` - Adaptadores para HTTP
  - Manejan requests/responses

- **🛣️ Routes**: 
  - `AppRoutes`, `AuthRoutes` - Configuración de rutas
  - Define endpoints de la API

- **🖥️ Server**: 
  - Configuración del servidor Express
  - Middleware y configuración general

### 4. 💾 Data Layer (`src/data/`)

> **Propósito**: Implementaciones específicas de persistencia de datos.

#### 📁 Componentes:

- **🍃 MongoDB**: Implementación para base de datos NoSQL
- **🐘 PostgreSQL**: Implementación para base de datos relacional

---

## ⚡ Principios SOLID Aplicados

### 🔄 Dependency Inversion Principle (DIP)
```typescript
// ✅ Los controladores dependen de abstracciones
constructor(
    private readonly authRepository: AuthRepository  // Interface, no implementación
) {}
```

### 🎯 Single Responsibility Principle (SRP)
- **AuthController**: Solo maneja requests HTTP
- **AuthRepository**: Solo define contratos de acceso a datos
- **UserEntity**: Solo representa un usuario del dominio

### 🔓 Open/Closed Principle (OCP)
- ✅ Fácil extensión mediante nuevas implementaciones
- ✅ Nuevos datasources sin modificar código existente

### 🔗 Interface Segregation Principle (ISP)
- ✅ Interfaces específicas y cohesivas
- ✅ No hay dependencias innecesarias

### 🔄 Liskov Substitution Principle (LSP)
- ✅ Cualquier implementación puede sustituir a su abstracción

---

## 🌟 Características Hexagonales

### 🔌 Puertos (Ports)
```typescript
// Interface que define el contrato
export abstract class AuthRepository {
    abstract registerUser(registerUserDto: RegisterUserDto): Promise<UserEntity>;
}
```

### 🔧 Adaptadores (Adapters)
```typescript
// Implementación concreta del puerto
export class AuthRepositoryImpl implements AuthRepository {
    constructor(private readonly authDatasource: AuthDatasource) {}
    
    registerUser(registerUserDto: RegisterUserDto): Promise<UserEntity> {
        return this.authDatasource.registerUser(registerUserDto);
    }
}
```

### 🔄 Inversión de Dependencias
- 🎯 **El dominio NO depende** de infraestructura
- 🔌 **La infraestructura SÍ depende** del dominio
- 🛡️ **Protección** contra cambios externos

### 🎨 Separación de Responsabilidades
- 🧠 **Domain**: Lógica de negocio pura
- 🔧 **Infrastructure**: Implementaciones técnicas
- 🎨 **Presentation**: Interfaz de usuario
- 💾 **Data**: Persistencia específica

---

## 🚀 Beneficios de esta Arquitectura

### ✅ Ventajas

- 🛡️ **Testabilidad**: Fácil testing con mocks
- 🔄 **Flexibilidad**: Cambios sin afectar el dominio
- 🎯 **Mantenibilidad**: Código organizado y claro
- 🔌 **Extensibilidad**: Nuevas funcionalidades sin romper existentes
- 🧪 **Independencia**: Tecnologías intercambiables

### 📊 Métricas de Calidad

- 🎯 **Alto Cohesion**: Cada clase tiene una responsabilidad clara
- 🔗 **Bajo Acoplamiento**: Dependencias mínimas entre capas
- 🧪 **Testabilidad**: 100% de cobertura posible
- 🔄 **Reutilización**: Componentes independientes

---