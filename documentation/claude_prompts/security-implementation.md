# Security Implementation Guide for LexiMind Backend

## Overview

This document provides a comprehensive guide for implementing JWT-based authentication, authorization, rate limiting, and email verification in the LexiMind Backend API. The implementation follows Clean Architecture principles already established in the codebase.

---

## Table of Contents

1. [Security Requirements](#security-requirements)
2. [Architecture Overview](#architecture-overview)
3. [Dependencies](#dependencies)
4. [Environment Configuration](#environment-configuration)
5. [Phase 1: JWT Authentication Core](#phase-1-jwt-authentication-core)
6. [Phase 2: Authentication Middleware](#phase-2-authentication-middleware)
7. [Phase 3: Rate Limiting](#phase-3-rate-limiting)
8. [Phase 4: Email Verification](#phase-4-email-verification)
9. [Phase 5: RBAC-Ready Architecture](#phase-5-rbac-ready-architecture)
10. [Testing Security Features](#testing-security-features)
11. [Security Best Practices](#security-best-practices)
12. [Troubleshooting](#troubleshooting)

---

## Security Requirements

Based on project needs, the following security features will be implemented:

- **JWT Custom Implementation**: Using `jsonwebtoken` library (not Supabase Auth)
- **Protected Routes**: All endpoints require authentication except `/api/auth/*`
- **Basic Authentication**: Start simple, but design for future RBAC expansion
- **Rate Limiting**: Prevent abuse and DoS attacks
- **Email Verification**: Ensure user email ownership before activation
- **Password Security**: Bcrypt hashing with appropriate cost factor
- **Token Management**: Access tokens (short-lived) + Refresh tokens (long-lived)

---

## Architecture Overview

### Clean Architecture Layers

```
src/
├── domain/
│   ├── entities/
│   │   ├── auth-token.entity.ts          # NEW: JWT token entity
│   │   ├── verification-token.entity.ts  # NEW: Email verification entity
│   │   └── user.entity.ts                # MODIFY: Add email verification fields
│   ├── repositories/
│   │   └── auth.repository.ts            # NEW: Auth repository interface
│   ├── dtos/
│   │   ├── login.dto.ts                  # NEW: Login request/response DTOs
│   │   ├── register.dto.ts               # NEW: Register request/response DTOs
│   │   └── verify-email.dto.ts           # NEW: Email verification DTOs
│   └── enums/
│       └── user-roles.enum.ts            # NEW: Role definitions (Phase 5)
│
├── infrastructure/
│   ├── services/
│   │   ├── jwt.service.ts                # NEW: JWT token generation/validation
│   │   ├── email.service.ts              # NEW: Email sending service
│   │   └── hash.service.ts               # NEW: Password hashing service
│   └── repositories/
│       └── auth.repository.impl.ts       # NEW: Auth repository implementation
│
└── presentation/
    ├── middlewares/
    │   ├── auth.middleware.ts            # NEW: JWT verification middleware
    │   ├── roles.middleware.ts           # NEW: RBAC middleware (Phase 5)
    │   ├── rate-limit.middleware.ts      # NEW: Rate limiting
    │   └── error.middleware.ts           # NEW: Error handling
    ├── auth/
    │   ├── controller.ts                 # MODIFY: Complete login/register
    │   ├── routes.ts                     # MODIFY: Add new auth routes
    │   └── dependencies.ts               # MODIFY: Inject security services
    └── server.ts                         # MODIFY: Apply global middleware
```

### Authentication Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │
       │ 1. POST /api/auth/register
       │    { email, password, name }
       ▼
┌─────────────────────────────────────────┐
│  AuthController.register()              │
│  - Validate input                       │
│  - Hash password (bcrypt)               │
│  - Create user in MongoDB               │
│  - Generate verification token          │
│  - Send verification email              │
│  - Return success message               │
└─────────────────────────────────────────┘
       │
       │ 2. POST /api/auth/verify-email
       │    { email, code }
       ▼
┌─────────────────────────────────────────┐
│  AuthController.verifyEmail()           │
│  - Validate verification code           │
│  - Mark user as verified                │
│  - Return success                       │
└─────────────────────────────────────────┘
       │
       │ 3. POST /api/auth/login
       │    { email, password }
       ▼
┌─────────────────────────────────────────┐
│  AuthController.login()                 │
│  - Check email verified                 │
│  - Validate password                    │
│  - Generate JWT tokens                  │
│  - Return access + refresh tokens       │
└─────────────┬───────────────────────────┘
              │
              │ 4. GET /api/v1/chats/process-message
              │    Authorization: Bearer <token>
              ▼
┌─────────────────────────────────────────┐
│  AuthMiddleware                         │
│  - Extract token from header            │
│  - Validate with JWT service            │
│  - Attach user to req.user              │
│  - Call next()                          │
└─────────────┬───────────────────────────┘
              │
              │ 5. Controller processes request
              │    with authenticated user
              ▼
┌─────────────────────────────────────────┐
│  ChatsController.processMessage()       │
│  - Access req.user.id                   │
│  - Process RAG query                    │
│  - Return response                      │
└─────────────────────────────────────────┘
```

---

## Dependencies

### Installation

```bash
npm install jsonwebtoken bcryptjs express-rate-limit nodemailer
npm install -D @types/jsonwebtoken @types/bcryptjs @types/nodemailer
```

### Package Descriptions

- **jsonwebtoken**: JWT token generation and verification
- **bcryptjs**: Password hashing (pure JavaScript, no native dependencies)
- **express-rate-limit**: Request rate limiting middleware
- **nodemailer**: Email sending (supports Gmail, SendGrid, SMTP)

---

## Environment Configuration

### Add to `.env` file

```bash
# JWT Configuration
JWT_SECRET=your-super-secret-key-change-this-in-production-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Email Service (choose one)
EMAIL_SERVICE=gmail  # or 'sendgrid', 'smtp'
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM=noreply@leximind.com

# For SendGrid (alternative)
# SENDGRID_API_KEY=SG.xxxxxxxxxxxxx

# Security
BCRYPT_ROUNDS=10
VERIFICATION_CODE_EXPIRY=24h
```

### Add to `src/config/envs.ts`

```typescript
import 'dotenv/config'
import { get } from 'env-var'

export const envs = {
  // ... existing config

  // JWT
  JWT_SECRET: get('JWT_SECRET').required().asString(),
  JWT_ACCESS_EXPIRY: get('JWT_ACCESS_EXPIRY').default('15m').asString(),
  JWT_REFRESH_EXPIRY: get('JWT_REFRESH_EXPIRY').default('7d').asString(),

  // Email
  EMAIL_SERVICE: get('EMAIL_SERVICE').required().asString(),
  EMAIL_USER: get('EMAIL_USER').required().asString(),
  EMAIL_PASSWORD: get('EMAIL_PASSWORD').required().asString(),
  EMAIL_FROM: get('EMAIL_FROM').default('noreply@leximind.com').asString(),

  // Security
  BCRYPT_ROUNDS: get('BCRYPT_ROUNDS').default('10').asIntPositive(),
  VERIFICATION_CODE_EXPIRY: get('VERIFICATION_CODE_EXPIRY')
    .default('24h')
    .asString(),
}
```

---

## Phase 1: JWT Authentication Core

### 1.1 Create Domain Entities

#### `src/domain/entities/auth-token.entity.ts`

```typescript
export class AuthToken {
  constructor(
    public readonly accessToken: string,
    public readonly refreshToken: string,
    public readonly expiresIn: number, // seconds
    public readonly tokenType: string = 'Bearer'
  ) {}
}
```

#### `src/domain/entities/verification-token.entity.ts`

```typescript
export class VerificationToken {
  constructor(
    public readonly code: string,
    public readonly expiresAt: Date,
    public readonly createdAt: Date = new Date()
  ) {}

  isExpired(): boolean {
    return new Date() > this.expiresAt
  }
}
```

### 1.2 Update User Entity

#### `src/domain/entities/user.entity.ts` (add fields)

```typescript
export class User {
  constructor(
    public id: string,
    public email: string,
    public password: string, // Hashed
    public name: string,
    public role: string[],
    public createdAt: Date,
    public updatedAt: Date,
    // NEW FIELDS
    public isEmailVerified: boolean = false,
    public verificationCode?: string,
    public verificationCodeExpiry?: Date,
    public refreshToken?: string,
    public lastLogin?: Date
  ) {}
}
```

### 1.3 Create DTOs

#### `src/domain/dtos/register.dto.ts`

```typescript
export interface RegisterRequestDto {
  email: string
  password: string
  name: string
  confirmPassword: string
}

export interface RegisterResponseDto {
  message: string
  email: string
}
```

#### `src/domain/dtos/login.dto.ts`

```typescript
export interface LoginRequestDto {
  email: string
  password: string
}

export interface LoginResponseDto {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
  user: {
    id: string
    email: string
    name: string
    role: string[]
  }
}
```

#### `src/domain/dtos/verify-email.dto.ts`

```typescript
export interface VerifyEmailRequestDto {
  email: string
  code: string
}

export interface VerifyEmailResponseDto {
  message: string
  verified: boolean
}
```

### 1.4 Create Repository Interface

#### `src/domain/repositories/auth.repository.ts`

```typescript
import { User } from '../entities/user.entity.js'

export interface AuthRepository {
  register(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>
  findByEmail(email: string): Promise<User | null>
  findById(id: string): Promise<User | null>
  updateUser(id: string, updates: Partial<User>): Promise<User>
  saveRefreshToken(userId: string, refreshToken: string): Promise<void>
  verifyEmail(userId: string): Promise<void>
}
```

### 1.5 Create Infrastructure Services

#### `src/infrastructure/services/hash.service.ts`

```typescript
import bcrypt from 'bcryptjs'
import { envs } from '../../config/envs.js'

export class HashService {
  private readonly saltRounds: number

  constructor() {
    this.saltRounds = envs.BCRYPT_ROUNDS
  }

  async hash(plainText: string): Promise<string> {
    return bcrypt.hash(plainText, this.saltRounds)
  }

  async compare(plainText: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plainText, hash)
  }
}
```

#### `src/infrastructure/services/jwt.service.ts`

```typescript
import jwt from 'jsonwebtoken'
import { envs } from '../../config/envs.js'

export interface JwtPayload {
  userId: string
  email: string
  role: string[]
  type: 'access' | 'refresh'
}

export class JwtService {
  private readonly secret: string
  private readonly accessExpiry: string
  private readonly refreshExpiry: string

  constructor() {
    this.secret = envs.JWT_SECRET
    this.accessExpiry = envs.JWT_ACCESS_EXPIRY
    this.refreshExpiry = envs.JWT_REFRESH_EXPIRY
  }

  generateAccessToken(userId: string, email: string, role: string[]): string {
    const payload: JwtPayload = {
      userId,
      email,
      role,
      type: 'access',
    }

    return jwt.sign(payload, this.secret, {
      expiresIn: this.accessExpiry,
      issuer: 'leximind-api',
      audience: 'leximind-client',
    })
  }

  generateRefreshToken(userId: string, email: string, role: string[]): string {
    const payload: JwtPayload = {
      userId,
      email,
      role,
      type: 'refresh',
    }

    return jwt.sign(payload, this.secret, {
      expiresIn: this.refreshExpiry,
      issuer: 'leximind-api',
      audience: 'leximind-client',
    })
  }

  verifyToken(token: string): JwtPayload {
    try {
      const decoded = jwt.verify(token, this.secret, {
        issuer: 'leximind-api',
        audience: 'leximind-client',
      }) as JwtPayload

      return decoded
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new Error('Token has expired')
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new Error('Invalid token')
      }
      throw new Error('Token verification failed')
    }
  }

  decodeToken(token: string): JwtPayload | null {
    try {
      return jwt.decode(token) as JwtPayload
    } catch {
      return null
    }
  }

  getExpiryInSeconds(expiry: string): number {
    // Convert "15m", "7d" to seconds
    const unit = expiry.slice(-1)
    const value = parseInt(expiry.slice(0, -1))

    switch (unit) {
      case 's':
        return value
      case 'm':
        return value * 60
      case 'h':
        return value * 60 * 60
      case 'd':
        return value * 60 * 60 * 24
      default:
        return 900 // default 15 minutes
    }
  }
}
```

#### `src/infrastructure/services/email.service.ts`

```typescript
import nodemailer, { Transporter } from 'nodemailer'
import { envs } from '../../config/envs.js'

export class EmailService {
  private transporter: Transporter

  constructor() {
    this.transporter = nodemailer.createTransport({
      service: envs.EMAIL_SERVICE,
      auth: {
        user: envs.EMAIL_USER,
        pass: envs.EMAIL_PASSWORD,
      },
    })
  }

  async sendVerificationEmail(
    to: string,
    name: string,
    code: string
  ): Promise<void> {
    const mailOptions = {
      from: envs.EMAIL_FROM,
      to,
      subject: 'Verifica tu cuenta de LexiMind',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2c3e50;">Bienvenido a LexiMind, ${name}!</h2>
          <p>Gracias por registrarte. Para activar tu cuenta, por favor verifica tu correo electrónico usando el siguiente código:</p>
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #3498db; letter-spacing: 5px; margin: 0;">${code}</h1>
          </div>
          <p>Este código expirará en 24 horas.</p>
          <p>Si no creaste esta cuenta, puedes ignorar este correo de forma segura.</p>
          <hr style="border: none; border-top: 1px solid #ecf0f1; margin: 30px 0;">
          <p style="color: #7f8c8d; font-size: 12px;">Este es un correo automático, por favor no respondas.</p>
        </div>
      `,
    }

    try {
      await this.transporter.sendMail(mailOptions)
      console.log(`Verification email sent to ${to}`)
    } catch (error) {
      console.error('Error sending email:', error)
      throw new Error('Failed to send verification email')
    }
  }

  async sendPasswordResetEmail(
    to: string,
    name: string,
    resetToken: string
  ): Promise<void> {
    // Future implementation
    console.log(`Password reset email for ${to} with token ${resetToken}`)
  }
}
```

### 1.6 Implement Auth Repository

#### `src/infrastructure/repositories/auth.repository.impl.ts`

```typescript
import { AuthRepository } from '../../domain/repositories/auth.repository.js'
import { User } from '../../domain/entities/user.entity.js'
import { MongoDatabase } from '../../data/mongodb/mongo-database.js'

export class AuthRepositoryImpl implements AuthRepository {
  private readonly collection = 'users'

  constructor(private readonly db: MongoDatabase) {}

  async register(
    userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<User> {
    const now = new Date()
    const userDoc = {
      ...userData,
      createdAt: now,
      updatedAt: now,
    }

    const result = await this.db.getCollection(this.collection).insertOne(userDoc)

    return new User(
      result.insertedId.toString(),
      userDoc.email,
      userDoc.password,
      userDoc.name,
      userDoc.role,
      userDoc.createdAt,
      userDoc.updatedAt,
      userDoc.isEmailVerified,
      userDoc.verificationCode,
      userDoc.verificationCodeExpiry
    )
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.db
      .getCollection(this.collection)
      .findOne({ email: email.toLowerCase() })

    if (!user) return null

    return new User(
      user._id.toString(),
      user.email,
      user.password,
      user.name,
      user.role || [],
      user.createdAt,
      user.updatedAt,
      user.isEmailVerified || false,
      user.verificationCode,
      user.verificationCodeExpiry,
      user.refreshToken,
      user.lastLogin
    )
  }

  async findById(id: string): Promise<User | null> {
    const { ObjectId } = await import('mongodb')
    const user = await this.db
      .getCollection(this.collection)
      .findOne({ _id: new ObjectId(id) })

    if (!user) return null

    return new User(
      user._id.toString(),
      user.email,
      user.password,
      user.name,
      user.role || [],
      user.createdAt,
      user.updatedAt,
      user.isEmailVerified || false,
      user.verificationCode,
      user.verificationCodeExpiry,
      user.refreshToken,
      user.lastLogin
    )
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const { ObjectId } = await import('mongodb')
    const result = await this.db.getCollection(this.collection).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: 'after' }
    )

    if (!result) {
      throw new Error('User not found')
    }

    return new User(
      result._id.toString(),
      result.email,
      result.password,
      result.name,
      result.role || [],
      result.createdAt,
      result.updatedAt,
      result.isEmailVerified || false,
      result.verificationCode,
      result.verificationCodeExpiry,
      result.refreshToken,
      result.lastLogin
    )
  }

  async saveRefreshToken(userId: string, refreshToken: string): Promise<void> {
    const { ObjectId } = await import('mongodb')
    await this.db.getCollection(this.collection).updateOne(
      { _id: new ObjectId(userId) },
      { $set: { refreshToken, updatedAt: new Date() } }
    )
  }

  async verifyEmail(userId: string): Promise<void> {
    const { ObjectId } = await import('mongodb')
    await this.db.getCollection(this.collection).updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          isEmailVerified: true,
          verificationCode: undefined,
          verificationCodeExpiry: undefined,
          updatedAt: new Date(),
        },
      }
    )
  }
}
```

### 1.7 Update Auth Controller

#### `src/presentation/auth/controller.ts`

```typescript
import { Request, Response } from 'express'
import { AuthRepository } from '../../domain/repositories/auth.repository.js'
import { HashService } from '../../infrastructure/services/hash.service.js'
import { JwtService } from '../../infrastructure/services/jwt.service.js'
import { EmailService } from '../../infrastructure/services/email.service.js'
import {
  RegisterRequestDto,
  LoginRequestDto,
  VerifyEmailRequestDto,
} from '../../domain/dtos/index.js'

export class AuthController {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly hashService: HashService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService
  ) {}

  register = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password, name, confirmPassword } =
        req.body as RegisterRequestDto

      // Validation
      if (!email || !password || !name || !confirmPassword) {
        res.status(400).json({ error: 'Todos los campos son requeridos' })
        return
      }

      if (password !== confirmPassword) {
        res.status(400).json({ error: 'Las contraseñas no coinciden' })
        return
      }

      if (password.length < 8) {
        res
          .status(400)
          .json({ error: 'La contraseña debe tener al menos 8 caracteres' })
        return
      }

      // Check if user exists
      const existingUser = await this.authRepository.findByEmail(email)
      if (existingUser) {
        res.status(409).json({ error: 'El correo ya está registrado' })
        return
      }

      // Hash password
      const hashedPassword = await this.hashService.hash(password)

      // Generate verification code
      const verificationCode = Math.floor(
        100000 + Math.random() * 900000
      ).toString()
      const verificationCodeExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

      // Create user
      const user = await this.authRepository.register({
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        role: ['USER'],
        isEmailVerified: false,
        verificationCode,
        verificationCodeExpiry,
      })

      // Send verification email
      await this.emailService.sendVerificationEmail(
        email,
        name,
        verificationCode
      )

      res.status(201).json({
        message:
          'Usuario registrado exitosamente. Por favor verifica tu correo electrónico.',
        email: user.email,
      })
    } catch (error) {
      console.error('Error in register:', error)
      res.status(500).json({ error: 'Error al registrar usuario' })
    }
  }

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body as LoginRequestDto

      // Validation
      if (!email || !password) {
        res
          .status(400)
          .json({ error: 'Email y contraseña son requeridos' })
        return
      }

      // Find user
      const user = await this.authRepository.findByEmail(email)
      if (!user) {
        res.status(401).json({ error: 'Credenciales inválidas' })
        return
      }

      // Check email verification
      if (!user.isEmailVerified) {
        res.status(403).json({
          error:
            'Por favor verifica tu correo electrónico antes de iniciar sesión',
        })
        return
      }

      // Verify password
      const isPasswordValid = await this.hashService.compare(
        password,
        user.password
      )
      if (!isPasswordValid) {
        res.status(401).json({ error: 'Credenciales inválidas' })
        return
      }

      // Generate tokens
      const accessToken = this.jwtService.generateAccessToken(
        user.id,
        user.email,
        user.role
      )
      const refreshToken = this.jwtService.generateRefreshToken(
        user.id,
        user.email,
        user.role
      )

      // Save refresh token
      await this.authRepository.saveRefreshToken(user.id, refreshToken)

      // Update last login
      await this.authRepository.updateUser(user.id, { lastLogin: new Date() })

      res.status(200).json({
        accessToken,
        refreshToken,
        expiresIn: this.jwtService.getExpiryInSeconds(
          process.env.JWT_ACCESS_EXPIRY || '15m'
        ),
        tokenType: 'Bearer',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
      })
    } catch (error) {
      console.error('Error in login:', error)
      res.status(500).json({ error: 'Error al iniciar sesión' })
    }
  }

  verifyEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, code } = req.body as VerifyEmailRequestDto

      if (!email || !code) {
        res.status(400).json({ error: 'Email y código son requeridos' })
        return
      }

      const user = await this.authRepository.findByEmail(email)
      if (!user) {
        res.status(404).json({ error: 'Usuario no encontrado' })
        return
      }

      if (user.isEmailVerified) {
        res.status(400).json({ error: 'El correo ya está verificado' })
        return
      }

      if (
        user.verificationCode !== code ||
        !user.verificationCodeExpiry ||
        new Date() > user.verificationCodeExpiry
      ) {
        res
          .status(400)
          .json({ error: 'Código de verificación inválido o expirado' })
        return
      }

      await this.authRepository.verifyEmail(user.id)

      res.status(200).json({
        message: 'Correo verificado exitosamente',
        verified: true,
      })
    } catch (error) {
      console.error('Error in verifyEmail:', error)
      res.status(500).json({ error: 'Error al verificar correo' })
    }
  }

  refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body

      if (!refreshToken) {
        res.status(400).json({ error: 'Refresh token es requerido' })
        return
      }

      // Verify refresh token
      const payload = this.jwtService.verifyToken(refreshToken)

      if (payload.type !== 'refresh') {
        res.status(401).json({ error: 'Token inválido' })
        return
      }

      // Find user
      const user = await this.authRepository.findById(payload.userId)
      if (!user || user.refreshToken !== refreshToken) {
        res.status(401).json({ error: 'Token inválido' })
        return
      }

      // Generate new tokens
      const newAccessToken = this.jwtService.generateAccessToken(
        user.id,
        user.email,
        user.role
      )
      const newRefreshToken = this.jwtService.generateRefreshToken(
        user.id,
        user.email,
        user.role
      )

      // Save new refresh token
      await this.authRepository.saveRefreshToken(user.id, newRefreshToken)

      res.status(200).json({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: this.jwtService.getExpiryInSeconds(
          process.env.JWT_ACCESS_EXPIRY || '15m'
        ),
        tokenType: 'Bearer',
      })
    } catch (error) {
      console.error('Error in refreshToken:', error)
      res.status(401).json({ error: 'Token inválido o expirado' })
    }
  }

  resendVerificationCode = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const { email } = req.body

      if (!email) {
        res.status(400).json({ error: 'Email es requerido' })
        return
      }

      const user = await this.authRepository.findByEmail(email)
      if (!user) {
        res.status(404).json({ error: 'Usuario no encontrado' })
        return
      }

      if (user.isEmailVerified) {
        res.status(400).json({ error: 'El correo ya está verificado' })
        return
      }

      // Generate new verification code
      const verificationCode = Math.floor(
        100000 + Math.random() * 900000
      ).toString()
      const verificationCodeExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

      await this.authRepository.updateUser(user.id, {
        verificationCode,
        verificationCodeExpiry,
      })

      await this.emailService.sendVerificationEmail(
        email,
        user.name,
        verificationCode
      )

      res
        .status(200)
        .json({ message: 'Código de verificación reenviado exitosamente' })
    } catch (error) {
      console.error('Error in resendVerificationCode:', error)
      res
        .status(500)
        .json({ error: 'Error al reenviar código de verificación' })
    }
  }
}
```

### 1.8 Update Dependencies

#### `src/presentation/auth/dependencies.ts`

```typescript
import { MongoDatabase } from '../../data/mongodb/mongo-database.js'
import { AuthRepositoryImpl } from '../../infrastructure/repositories/auth.repository.impl.js'
import { HashService } from '../../infrastructure/services/hash.service.js'
import { JwtService } from '../../infrastructure/services/jwt.service.js'
import { EmailService } from '../../infrastructure/services/email.service.js'
import { AuthController } from './controller.js'

// Get MongoDB instance
const db = MongoDatabase.getInstance()

// Initialize services
const hashService = new HashService()
const jwtService = new JwtService()
const emailService = new EmailService()

// Initialize repository
const authRepository = new AuthRepositoryImpl(db)

// Initialize controller
export const authController = new AuthController(
  authRepository,
  hashService,
  jwtService,
  emailService
)
```

### 1.9 Update Routes

#### `src/presentation/auth/routes.ts`

```typescript
import { Router } from 'express'
import { authController } from './dependencies.js'

export class AuthRoutes {
  static get routes(): Router {
    const router = Router()

    // Public routes
    router.post('/register', authController.register)
    router.post('/login', authController.login)
    router.post('/verify-email', authController.verifyEmail)
    router.post('/resend-verification', authController.resendVerificationCode)
    router.post('/refresh-token', authController.refreshToken)

    return router
  }
}
```

---

## Phase 2: Authentication Middleware

### 2.1 Create Auth Middleware

#### `src/presentation/middlewares/auth.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express'
import { JwtService } from '../../infrastructure/services/jwt.service.js'
import { AuthRepository } from '../../domain/repositories/auth.repository.js'

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string
        email: string
        role: string[]
      }
    }
  }
}

export class AuthMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly authRepository: AuthRepository
  ) {}

  authenticate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          error: 'No autorizado - Token no proporcionado',
        })
        return
      }

      const token = authHeader.substring(7) // Remove "Bearer " prefix

      // Verify token
      const payload = this.jwtService.verifyToken(token)

      if (payload.type !== 'access') {
        res.status(401).json({ error: 'Token inválido' })
        return
      }

      // Optional: Verify user still exists and is active
      const user = await this.authRepository.findById(payload.userId)
      if (!user) {
        res.status(401).json({ error: 'Usuario no encontrado' })
        return
      }

      if (!user.isEmailVerified) {
        res.status(403).json({ error: 'Email no verificado' })
        return
      }

      // Attach user to request
      req.user = {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
      }

      next()
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('expired')) {
          res.status(401).json({ error: 'Token expirado' })
          return
        }
        if (error.message.includes('invalid')) {
          res.status(401).json({ error: 'Token inválido' })
          return
        }
      }

      console.error('Error in auth middleware:', error)
      res.status(401).json({ error: 'No autorizado' })
    }
  }
}
```

### 2.2 Create Error Middleware

#### `src/presentation/middlewares/error.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express'

export class ErrorMiddleware {
  static handle(
    error: Error,
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    console.error('[Error Middleware]', {
      message: error.message,
      stack: error.stack,
      url: req.url,
      method: req.method,
    })

    // JWT errors
    if (error.name === 'JsonWebTokenError') {
      res.status(401).json({ error: 'Token inválido' })
      return
    }

    if (error.name === 'TokenExpiredError') {
      res.status(401).json({ error: 'Token expirado' })
      return
    }

    // Validation errors
    if (error.name === 'ValidationError') {
      res.status(400).json({ error: error.message })
      return
    }

    // Default error
    res.status(500).json({
      error: 'Error interno del servidor',
      ...(process.env.NODE_ENV === 'development' && {
        details: error.message,
      }),
    })
  }
}
```

### 2.3 Update Server Configuration

#### `src/presentation/server.ts` (modify)

```typescript
import express, { Router } from 'express'
import cors from 'cors'
import { envs } from '../config/envs.js'
import { AuthMiddleware } from './middlewares/auth.middleware.js'
import { ErrorMiddleware } from './middlewares/error.middleware.js'
import { JwtService } from '../infrastructure/services/jwt.service.js'
import { AuthRepositoryImpl } from '../infrastructure/repositories/auth.repository.impl.js'
import { MongoDatabase } from '../data/mongodb/mongo-database.js'

export class Server {
  public readonly app = express()
  private readonly port: number
  private readonly publicPaths = {
    auth: '/api/auth',
  }

  constructor() {
    this.port = envs.PORT

    // Configure middlewares
    this.middlewares()

    // Configure routes
    this.routes()

    // Error handling middleware (must be last)
    this.app.use(ErrorMiddleware.handle)
  }

  private middlewares() {
    // CORS
    const allowedOrigins = [
      'http://localhost:8080',
      'http://localhost:3000',
      'https://leximind.up.railway.app',
    ]

    this.app.use(
      cors({
        origin: (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true)
          } else {
            callback(new Error('Not allowed by CORS'))
          }
        },
        credentials: true,
      })
    )

    // Body parsing
    this.app.use(express.json())
    this.app.use(express.urlencoded({ extended: true }))

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`)
      next()
    })
  }

  private routes() {
    const router = Router()

    // Public routes (no authentication required)
    router.use(this.publicPaths.auth, AuthRoutes.routes)

    // Protected routes (authentication required)
    const db = MongoDatabase.getInstance()
    const jwtService = new JwtService()
    const authRepository = new AuthRepositoryImpl(db)
    const authMiddleware = new AuthMiddleware(jwtService, authRepository)

    // Apply auth middleware to all /api/v1/* routes
    router.use('/api/v1', authMiddleware.authenticate)

    // Mount protected routes
    router.use('/api/v1/chats', ChatsRoutes.routes)
    router.use('/api/v1/documents', DocumentsRoutes.routes)

    // Mount router
    this.app.use(router)

    // Health check (public)
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() })
    })
  }

  async listen() {
    this.app.listen(this.port, () => {
      console.log(`Server running on ${envs.HOST}:${this.port}`)
    })
  }
}
```

---

## Phase 3: Rate Limiting

### 3.1 Create Rate Limit Middleware

#### `src/presentation/middlewares/rate-limit.middleware.ts`

```typescript
import rateLimit from 'express-rate-limit'

// Auth endpoints: 5 requests per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    error:
      'Demasiados intentos de autenticación. Por favor intenta de nuevo más tarde.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Store in memory (for production, use Redis)
  // store: new RedisStore({ ... })
})

// Chat endpoints: 30 requests per minute per user
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: {
    error: 'Demasiadas consultas. Por favor espera un momento.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    return req.user?.id || req.ip || 'unknown'
  },
})

// Document upload: 10 requests per hour per user
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    error: 'Límite de carga alcanzado. Por favor intenta más tarde.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    return req.user?.id || req.ip || 'unknown'
  },
})

// General API: 100 requests per 15 minutes
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'Demasiadas solicitudes. Por favor intenta más tarde.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})
```

### 3.2 Apply Rate Limiters to Routes

#### `src/presentation/auth/routes.ts` (modify)

```typescript
import { Router } from 'express'
import { authController } from './dependencies.js'
import { authLimiter } from '../middlewares/rate-limit.middleware.js'

export class AuthRoutes {
  static get routes(): Router {
    const router = Router()

    // Apply rate limiter to all auth routes
    router.use(authLimiter)

    router.post('/register', authController.register)
    router.post('/login', authController.login)
    router.post('/verify-email', authController.verifyEmail)
    router.post('/resend-verification', authController.resendVerificationCode)
    router.post('/refresh-token', authController.refreshToken)

    return router
  }
}
```

#### `src/presentation/chats/routes.ts` (modify)

```typescript
import { Router } from 'express'
import { chatsController } from './dependencies.js'
import { chatLimiter } from '../middlewares/rate-limit.middleware.js'

export class ChatsRoutes {
  static get routes(): Router {
    const router = Router()

    // Apply rate limiter
    router.use(chatLimiter)

    router.post('/process-message', chatsController.processMessage)
    router.get('/health', chatsController.health)
    router.get('/diagnostics', chatsController.diagnostics)

    return router
  }
}
```

#### `src/presentation/documents/routes.ts` (modify)

```typescript
import { Router } from 'express'
import { documentsController } from './dependencies.js'
import { uploadLimiter } from '../middlewares/rate-limit.middleware.js'

export class DocumentsRoutes {
  static get routes(): Router {
    const router = Router()

    // Apply rate limiter to upload
    router.post('/upload', uploadLimiter, documentsController.upload)

    return router
  }
}
```

### 3.3 Production: Redis-based Rate Limiting (Optional)

For production with multiple server instances, use Redis:

```bash
npm install rate-limit-redis ioredis
npm install -D @types/ioredis
```

```typescript
import Redis from 'ioredis'
import { RedisStore } from 'rate-limit-redis'

const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
})

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  store: new RedisStore({
    client: redisClient,
    prefix: 'rate-limit:auth:',
  }),
})
```

---

## Phase 4: Email Verification

Already implemented in Phase 1! Summary:

### Flow

1. **User registers** → receives 6-digit code via email
2. **User submits code** → `POST /api/auth/verify-email { email, code }`
3. **System validates** → marks `isEmailVerified: true`
4. **User can login** → only if email is verified

### Endpoints

- `POST /api/auth/register` - Sends verification code
- `POST /api/auth/verify-email` - Validates code
- `POST /api/auth/resend-verification` - Resends code if expired
- `POST /api/auth/login` - Checks `isEmailVerified` before allowing login

### Email Template

Located in `EmailService.sendVerificationEmail()`. Customize HTML template as needed.

---

## Phase 5: RBAC-Ready Architecture

### 5.1 Create Role Enum

#### `src/domain/enums/user-roles.enum.ts`

```typescript
export enum UserRole {
  ADMIN = 'ADMIN',
  EXPERT = 'EXPERT',
  USER = 'USER',
}

export const RoleHierarchy = {
  [UserRole.ADMIN]: 3,
  [UserRole.EXPERT]: 2,
  [UserRole.USER]: 1,
}
```

### 5.2 Create Roles Middleware

#### `src/presentation/middlewares/roles.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express'
import { UserRole } from '../../domain/enums/user-roles.enum.js'

export class RolesMiddleware {
  static requireRole(...allowedRoles: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({ error: 'No autenticado' })
        return
      }

      const userRoles = req.user.role
      const hasRole = allowedRoles.some((role) => userRoles.includes(role))

      if (!hasRole) {
        res.status(403).json({
          error: 'No tienes permisos para acceder a este recurso',
        })
        return
      }

      next()
    }
  }

  static requireAnyRole(...allowedRoles: UserRole[]) {
    return RolesMiddleware.requireRole(...allowedRoles)
  }

  static requireAllRoles(...requiredRoles: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({ error: 'No autenticado' })
        return
      }

      const userRoles = req.user.role
      const hasAllRoles = requiredRoles.every((role) =>
        userRoles.includes(role)
      )

      if (!hasAllRoles) {
        res.status(403).json({
          error: 'No tienes los permisos necesarios',
        })
        return
      }

      next()
    }
  }
}
```

### 5.3 Example Usage in Routes

```typescript
import { Router } from 'express'
import { documentsController } from './dependencies.js'
import { RolesMiddleware } from '../middlewares/roles.middleware.js'
import { UserRole } from '../../domain/enums/user-roles.enum.js'

export class DocumentsRoutes {
  static get routes(): Router {
    const router = Router()

    // Only ADMIN can upload documents
    router.post(
      '/upload',
      RolesMiddleware.requireRole(UserRole.ADMIN),
      documentsController.upload
    )

    // ADMIN and EXPERT can view all documents
    router.get(
      '/all',
      RolesMiddleware.requireAnyRole(UserRole.ADMIN, UserRole.EXPERT),
      documentsController.getAllDocuments
    )

    return router
  }
}
```

---

## Testing Security Features

### 6.1 Unit Tests for JWT Service

#### `tests/unit/services/jwt.service.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { JwtService } from '@/infrastructure/services/jwt.service.js'

describe('JwtService', () => {
  let jwtService: JwtService

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-key-for-testing-purposes-only'
    process.env.JWT_ACCESS_EXPIRY = '15m'
    process.env.JWT_REFRESH_EXPIRY = '7d'
    jwtService = new JwtService()
  })

  describe('generateAccessToken', () => {
    it('should generate valid access token', () => {
      const token = jwtService.generateAccessToken(
        'user-123',
        'test@example.com',
        ['USER']
      )

      expect(token).toBeDefined()
      expect(typeof token).toBe('string')
      expect(token.split('.')).toHaveLength(3) // JWT has 3 parts
    })
  })

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const token = jwtService.generateAccessToken(
        'user-123',
        'test@example.com',
        ['USER']
      )

      const payload = jwtService.verifyToken(token)

      expect(payload.userId).toBe('user-123')
      expect(payload.email).toBe('test@example.com')
      expect(payload.role).toEqual(['USER'])
      expect(payload.type).toBe('access')
    })

    it('should throw error for invalid token', () => {
      expect(() => jwtService.verifyToken('invalid-token')).toThrow(
        'Invalid token'
      )
    })

    it('should throw error for expired token', async () => {
      process.env.JWT_ACCESS_EXPIRY = '1ms'
      const shortLivedService = new JwtService()

      const token = shortLivedService.generateAccessToken(
        'user-123',
        'test@example.com',
        ['USER']
      )

      // Wait for token to expire
      await new Promise((resolve) => setTimeout(resolve, 10))

      expect(() => shortLivedService.verifyToken(token)).toThrow(
        'Token has expired'
      )
    })
  })

  describe('generateRefreshToken', () => {
    it('should generate refresh token with correct type', () => {
      const token = jwtService.generateRefreshToken(
        'user-123',
        'test@example.com',
        ['USER']
      )

      const payload = jwtService.verifyToken(token)
      expect(payload.type).toBe('refresh')
    })
  })
})
```

### 6.2 Integration Tests for Auth Endpoints

#### `tests/integration/api/auth.routes.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import express, { Application } from 'express'
import { AuthRoutes } from '@/presentation/auth/routes.js'
import { MongoDatabase } from '@/data/mongodb/mongo-database.js'

describe('Auth API Integration Tests', () => {
  let app: Application
  let testEmail: string

  beforeAll(async () => {
    // Setup Express app
    app = express()
    app.use(express.json())
    app.use('/api/auth', AuthRoutes.routes)

    // Connect to test database
    await MongoDatabase.connect(process.env.MONGO_URL!)
  })

  afterAll(async () => {
    // Cleanup
    await MongoDatabase.disconnect()
  })

  beforeEach(() => {
    // Generate unique email for each test
    testEmail = `test-${Date.now()}@example.com`
  })

  describe('POST /api/auth/register', () => {
    it('should register new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: 'Password123!',
          confirmPassword: 'Password123!',
          name: 'Test User',
        })
        .expect(201)

      expect(response.body).toHaveProperty('message')
      expect(response.body).toHaveProperty('email', testEmail)
    })

    it('should reject registration with weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: 'weak',
          confirmPassword: 'weak',
          name: 'Test User',
        })
        .expect(400)

      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('8 caracteres')
    })

    it('should reject registration with mismatched passwords', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: testEmail,
          password: 'Password123!',
          confirmPassword: 'DifferentPassword123!',
          name: 'Test User',
        })
        .expect(400)

      expect(response.body.error).toContain('no coinciden')
    })
  })

  describe('POST /api/auth/login', () => {
    it('should reject login with unverified email', async () => {
      // First register
      await request(app).post('/api/auth/register').send({
        email: testEmail,
        password: 'Password123!',
        confirmPassword: 'Password123!',
        name: 'Test User',
      })

      // Try to login without verification
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: 'Password123!',
        })
        .expect(403)

      expect(response.body.error).toContain('verifica tu correo')
    })
  })
})
```

### 6.3 Tests for Auth Middleware

#### `tests/unit/middlewares/auth.middleware.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { AuthMiddleware } from '@/presentation/middlewares/auth.middleware.js'
import { JwtService } from '@/infrastructure/services/jwt.service.js'
import { AuthRepository } from '@/domain/repositories/auth.repository.js'

describe('AuthMiddleware', () => {
  let authMiddleware: AuthMiddleware
  let mockJwtService: JwtService
  let mockAuthRepository: AuthRepository
  let mockRequest: Partial<Request>
  let mockResponse: Partial<Response>
  let mockNext: NextFunction

  beforeEach(() => {
    mockJwtService = {
      verifyToken: vi.fn(),
    } as any

    mockAuthRepository = {
      findById: vi.fn(),
    } as any

    authMiddleware = new AuthMiddleware(mockJwtService, mockAuthRepository)

    mockRequest = {
      headers: {},
    }

    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    }

    mockNext = vi.fn()
  })

  it('should reject request without Authorization header', async () => {
    await authMiddleware.authenticate(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    )

    expect(mockResponse.status).toHaveBeenCalledWith(401)
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should reject request with invalid token format', async () => {
    mockRequest.headers = { authorization: 'InvalidFormat' }

    await authMiddleware.authenticate(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    )

    expect(mockResponse.status).toHaveBeenCalledWith(401)
    expect(mockNext).not.toHaveBeenCalled()
  })

  it('should authenticate valid token and attach user to request', async () => {
    const mockPayload = {
      userId: 'user-123',
      email: 'test@example.com',
      role: ['USER'],
      type: 'access' as const,
    }

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      isEmailVerified: true,
    }

    mockRequest.headers = { authorization: 'Bearer valid-token' }
    vi.mocked(mockJwtService.verifyToken).mockReturnValue(mockPayload)
    vi.mocked(mockAuthRepository.findById).mockResolvedValue(mockUser as any)

    await authMiddleware.authenticate(
      mockRequest as Request,
      mockResponse as Response,
      mockNext
    )

    expect(mockRequest.user).toEqual({
      id: 'user-123',
      email: 'test@example.com',
      role: ['USER'],
    })
    expect(mockNext).toHaveBeenCalled()
  })
})
```

---

## Security Best Practices

### 7.1 Password Security

```typescript
// ✅ Good: Strong hashing with bcrypt
const hash = await bcrypt.hash(password, 10)

// ❌ Bad: Weak hashing or plain text
const hash = crypto.createHash('md5').update(password).digest('hex')
```

### 7.2 Token Storage

**Client-side recommendations:**

```javascript
// ✅ Good: Store in memory or secure httpOnly cookies
const token = response.data.accessToken
// Store in React state or Redux store, NOT localStorage

// ❌ Bad: localStorage is vulnerable to XSS
localStorage.setItem('token', token) // DON'T DO THIS
```

**Backend:**

```typescript
// ✅ Good: Short-lived access tokens
JWT_ACCESS_EXPIRY=15m

// ❌ Bad: Long-lived access tokens
JWT_ACCESS_EXPIRY=30d // Security risk
```

### 7.3 Environment Variables

```bash
# ✅ Good: Strong, random secret
JWT_SECRET=a7f8d9c6b4e3a2f1d8c7b6a5e4d3c2b1a0f9e8d7c6b5a4e3d2c1b0a9f8e7d6c5

# ❌ Bad: Weak or default secret
JWT_SECRET=secret123
```

### 7.4 Error Messages

```typescript
// ✅ Good: Generic error messages
res.status(401).json({ error: 'Credenciales inválidas' })

// ❌ Bad: Reveals too much information
res.status(401).json({ error: 'Usuario existe pero contraseña incorrecta' })
```

### 7.5 Rate Limiting in Production

```typescript
// ✅ Good: Use Redis for distributed rate limiting
import { RedisStore } from 'rate-limit-redis'

// ❌ Bad: Memory store with multiple server instances
// (each instance has separate counters)
```

### 7.6 HTTPS Only (Production)

```typescript
// Add to production server config
app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect(`https://${req.headers.host}${req.url}`)
  }
  next()
})
```

### 7.7 CORS Configuration

```typescript
// ✅ Good: Whitelist specific origins
const allowedOrigins = ['https://your-frontend.com']

// ❌ Bad: Allow all origins
cors({ origin: '*' })
```

---

## Troubleshooting

### Common Issues

#### 1. "JWT Secret not found"

**Error:** `JWT_SECRET environment variable is not set`

**Solution:**

```bash
# Add to .env
JWT_SECRET=your-secret-key-min-32-characters-long
```

#### 2. "Email not sending"

**Error:** `Failed to send verification email`

**Possible causes:**

- Gmail App Password not configured correctly
- Less secure apps blocked in Gmail settings
- Network/firewall blocking SMTP

**Solution for Gmail:**

1. Enable 2FA on Gmail account
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Use App Password in `.env`:

```bash
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-16-char-app-password
```

#### 3. "Token verification failed"

**Error:** `Invalid token` when token should be valid

**Possible causes:**

- JWT_SECRET changed after token generation
- Token from different environment
- Token manually modified

**Solution:**

- Ensure JWT_SECRET is consistent across environments
- Re-login to get new token
- Check token hasn't been tampered with

#### 4. "Too many requests" on localhost

**Error:** Rate limiter blocking development

**Solution:**

```typescript
// In rate-limit.middleware.ts
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 1000 : 5, // High limit in dev
})
```

#### 5. MongoDB connection errors

**Error:** `User registration failed` with MongoDB connection error

**Solution:**

Ensure MongoDB connection in `src/app.ts`:

```typescript
// Uncomment these lines if using MongoDB for users
await MongoDatabase.connect(envs.MONGO_URL)
console.log('MongoDB connected')
```

#### 6. CORS errors after adding auth

**Error:** `Access to fetch blocked by CORS policy`

**Solution:**

Ensure auth endpoints are accessible:

```typescript
// In server.ts
const allowedOrigins = [
  'http://localhost:8080', // Your frontend dev server
  'https://your-production-frontend.com',
]
```

---

## Implementation Checklist

### Phase 1: JWT Authentication

- [ ] Install dependencies: `npm install jsonwebtoken bcryptjs express-rate-limit nodemailer`
- [ ] Add environment variables to `.env`
- [ ] Update `src/config/envs.ts` with new variables
- [ ] Create `AuthToken` entity
- [ ] Create `VerificationToken` entity
- [ ] Update `User` entity with verification fields
- [ ] Create DTOs (Register, Login, VerifyEmail)
- [ ] Create `AuthRepository` interface
- [ ] Implement `HashService`
- [ ] Implement `JwtService`
- [ ] Implement `EmailService`
- [ ] Implement `AuthRepositoryImpl`
- [ ] Update `AuthController` with all endpoints
- [ ] Update `AuthRoutes`
- [ ] Update `auth/dependencies.ts`
- [ ] Test registration flow
- [ ] Test email verification flow
- [ ] Test login flow
- [ ] Test refresh token flow

### Phase 2: Authentication Middleware

- [ ] Create `AuthMiddleware`
- [ ] Create `ErrorMiddleware`
- [ ] Update `server.ts` to apply middleware
- [ ] Add TypeScript declaration for `req.user`
- [ ] Test protected routes
- [ ] Test public routes
- [ ] Test expired token handling
- [ ] Test invalid token handling

### Phase 3: Rate Limiting

- [ ] Create `rate-limit.middleware.ts`
- [ ] Apply `authLimiter` to auth routes
- [ ] Apply `chatLimiter` to chat routes
- [ ] Apply `uploadLimiter` to upload routes
- [ ] Test rate limiting behavior
- [ ] Configure Redis for production (optional)

### Phase 4: Email Verification

- [ ] Configure email service (Gmail/SendGrid)
- [ ] Test verification email sending
- [ ] Test code validation
- [ ] Test code expiration
- [ ] Test resend functionality
- [ ] Verify login blocked until verified

### Phase 5: RBAC Architecture

- [ ] Create `UserRole` enum
- [ ] Create `RolesMiddleware`
- [ ] Apply role checks to sensitive endpoints
- [ ] Test role-based access control
- [ ] Document role hierarchy

### Testing

- [ ] Write unit tests for `JwtService`
- [ ] Write unit tests for `HashService`
- [ ] Write unit tests for `AuthMiddleware`
- [ ] Write integration tests for auth endpoints
- [ ] Write integration tests for protected routes
- [ ] Test rate limiting behavior
- [ ] Achieve >70% code coverage

---

## Next Steps

1. **Start with Phase 1**: Implement core JWT authentication
2. **Test thoroughly**: Use Vitest + Supertest
3. **Add middleware**: Protect routes with `AuthMiddleware`
4. **Implement rate limiting**: Prevent abuse
5. **Deploy**: Update Railway environment variables
6. **Monitor**: Watch for authentication errors in production logs
7. **Future enhancements**:
   - Password reset flow
   - OAuth integration (Google, GitHub)
   - Two-factor authentication (2FA)
   - Session management dashboard
   - User activity logging

---

## Resources

- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [Bcrypt Documentation](https://github.com/kelektiv/node.bcrypt.js)
- [Express Rate Limit](https://github.com/express-rate-limit/express-rate-limit)
- [Nodemailer Documentation](https://nodemailer.com/)

---

**Generated by:** Claude Code
**Date:** 2025-01-XX
**Project:** LexiMind Backend
**Version:** 1.0.0
