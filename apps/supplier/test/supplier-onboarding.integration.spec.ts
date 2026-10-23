import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Reflector } from '@nestjs/core';
import type { RmqContext } from '@nestjs/microservices';
import { Metadata } from '@grpc/grpc-js';
import { firstValueFrom } from 'rxjs';
import { CommandBus, CommonConfigService, RmqService, UnauthorizedException } from '@common';
import {
   SUPPLIER_MEMBER_STATUS,
   SUPPLIER_ROLES,
   SUPPLIER_STATUS,
   type IRegisterSupplierRequest,
} from '@contracts/supplier';
import { SupplierConfigService } from '@supplier/config';
import { SupplierGrpcController, SupplierRmqController } from '@supplier/adapters';
import { HandleSupplierRegisteredHandler, RegisterSupplierHandler } from '@supplier/commands';
import { GetMySupplierHandler } from '@supplier/queries';
import {
   SUPPLIER_MEMBER_REPOSITORY,
   SUPPLIER_REPOSITORY,
   type FindSuppliersParams,
   type ISupplierMemberRepository,
   type ISupplierRepository,
} from '@supplier/repositories';
import { SupplierService } from '@supplier/services';
import type {
   CreateSupplierData,
   CreateSupplierMemberData,
   SupplierEntity,
   SupplierMemberEntity,
   UpdateSupplierData,
   UpdateSupplierMemberData,
} from '@supplier/entities';

describe('Supplier Onboarding Integration Flow (gRPC & RabbitMQ)', () => {
   let grpcController: SupplierGrpcController;
   let rmqController: SupplierRmqController;
   let commandBus: CommandBus;
   let mockRmqService: { ack: jest.Mock };

   // In-memory simulation of Supplier database
   const mockSuppliers = new Map<string, SupplierEntity>();
   const mockMembers = new Map<string, SupplierMemberEntity>();

   const mockSupplierRepo: jest.Mocked<ISupplierRepository> = {
      findById: jest.fn((id: string) => Promise.resolve(mockSuppliers.get(id) || null)),
      findBySlug: jest.fn((slug: string) => {
         for (const s of mockSuppliers.values()) {
            if (s.supplierSlug === slug) return Promise.resolve(s);
         }
         return Promise.resolve(null);
      }),
      findByCode: jest.fn((code: string) => {
         for (const s of mockSuppliers.values()) {
            if (s.supplierCode === code) return Promise.resolve(s);
         }
         return Promise.resolve(null);
      }),
      findByIds: jest.fn((ids: string[]) => Promise.resolve(ids.map((id) => mockSuppliers.get(id)!).filter(Boolean))),
      findMany: jest.fn((_params: FindSuppliersParams) =>
         Promise.resolve({ items: Array.from(mockSuppliers.values()), total: mockSuppliers.size }),
      ),
      create: jest.fn((data: CreateSupplierData) => {
         const entity: SupplierEntity = {
            supplierId: 'supp-0192e21b-0001',
            supplierName: data.supplierName,
            supplierSlug: data.supplierSlug || 'test-organic-farm',
            supplierCode: data.supplierCode || 'SUPP-TOF',
            contactEmail: data.contactEmail || null,
            contactPhone: data.contactPhone || null,
            address: data.address || null,
            city: data.city || null,
            rating: 5,
            isVerified: false,
            supplierStatus: SUPPLIER_STATUS.ACTIVE,
            supplierLogoUrl: data.supplierLogoUrl || null,
            version: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
         };
         mockSuppliers.set(entity.supplierId, entity);
         return Promise.resolve(entity);
      }),
      update: jest.fn((_supplierId: string, _data: UpdateSupplierData) => Promise.resolve(null)),
      softDelete: jest.fn((_supplierId: string) => Promise.resolve(true)),
   };

   const mockMemberRepo: jest.Mocked<ISupplierMemberRepository> = {
      findById: jest.fn((id: string) => Promise.resolve(mockMembers.get(id) || null)),
      findByAccountId: jest.fn((accountId: string) => {
         for (const m of mockMembers.values()) {
            if (m.accountId === accountId) return Promise.resolve(m);
         }
         return Promise.resolve(null);
      }),
      findBySupplierId: jest.fn((supplierId: string) => {
         return Promise.resolve(Array.from(mockMembers.values()).filter((m) => m.supplierId === supplierId));
      }),
      create: jest.fn((data: CreateSupplierMemberData) => {
         const member: SupplierMemberEntity = {
            memberId: `mem-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            supplierId: data.supplierId ?? null,
            accountId: data.accountId,
            email: data.email,
            role: data.role ?? SUPPLIER_ROLES.SUPPLIER_ADMIN,
            memberStatus: data.memberStatus ?? SUPPLIER_MEMBER_STATUS.ACTIVE,
            joinedAt: data.joinedAt ?? null,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
         };
         mockMembers.set(member.accountId, member);
         return Promise.resolve(member);
      }),
      update: jest.fn((memberId: string, data: UpdateSupplierMemberData) => {
         for (const [accId, member] of mockMembers.entries()) {
            if (member.memberId === memberId) {
               const updated: SupplierMemberEntity = { ...member, ...data, updatedAt: new Date() };
               mockMembers.set(accId, updated);
               return Promise.resolve(updated);
            }
         }
         return Promise.resolve(null);
      }),
      softDelete: jest.fn((_memberId: string) => Promise.resolve(true)),
   };

   const mockConfigService = {
      port: 3008,
      grpcPort: 50054,
   };

   beforeAll(async () => {
      mockRmqService = {
         ack: jest.fn(),
      };

      const module: TestingModule = await Test.createTestingModule({
         controllers: [SupplierGrpcController, SupplierRmqController],
         providers: [
            CommandBus,
            EventEmitter2,
            Reflector,
            SupplierService,
            RegisterSupplierHandler,
            HandleSupplierRegisteredHandler,
            GetMySupplierHandler,
            { provide: SupplierConfigService, useValue: mockConfigService },
            { provide: CommonConfigService, useValue: mockConfigService },
            { provide: SUPPLIER_REPOSITORY, useValue: mockSupplierRepo },
            { provide: SUPPLIER_MEMBER_REPOSITORY, useValue: mockMemberRepo },
            { provide: RmqService, useValue: mockRmqService },
         ],
      }).compile();

      commandBus = module.get<CommandBus>(CommandBus);
      commandBus.registerHandler(module.get(RegisterSupplierHandler));
      commandBus.registerHandler(module.get(HandleSupplierRegisteredHandler));
      commandBus.registerHandler(module.get(GetMySupplierHandler));

      grpcController = module.get<SupplierGrpcController>(SupplierGrpcController);
      rmqController = module.get<SupplierRmqController>(SupplierRmqController);
   });

   beforeEach(() => {
      mockSuppliers.clear();
      mockMembers.clear();
      jest.clearAllMocks();
   });

   describe('Flow 1: Trusted Context Forwarding via gRPC Metadata', () => {
      it('should successfully register supplier and link accountId via gRPC metadata context', async () => {
         const accountId = '01a161f0-a4d7-7069-89e0-3e4ed4af4af8';
         const request: IRegisterSupplierRequest = {
            supplierName: 'Test Organic Farm',
            supplierCode: 'SUPP-TOF',
            contactEmail: 'supplier.owner@omni.vn',
            contactPhone: '0987654321',
            address: '123 Organic Way',
            city: 'Da Lat',
            supplierLogoUrl: 'https://cdn.omni.vn/logo.png',
         };

         // Pre-provision member from earlier registration
         mockMembers.set(accountId, {
            memberId: 'mem-001',
            accountId,
            supplierId: null,
            email: 'supplier.owner@omni.vn',
            role: SUPPLIER_ROLES.SUPPLIER_ADMIN,
            memberStatus: SUPPLIER_MEMBER_STATUS.ACTIVE,
            joinedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
         });

         const mockMetadata = new Metadata();
         mockMetadata.set('x-user-id', accountId);

         const response$ = grpcController.registerSupplier(request, mockMetadata);
         const result = await firstValueFrom(response$);

         expect(result.supplier.supplierId).toBe('supp-0192e21b-0001');
         expect(result.supplier.supplierName).toBe('Test Organic Farm');
         expect(result.supplier.supplierCode).toBe('SUPP-TOF');

         // Verify that member is now linked to the newly registered supplier
         const linkedMember = mockMembers.get(accountId);
         expect(linkedMember?.supplierId).toBe('supp-0192e21b-0001');
      });

      it('should extract accountId from x-account-id metadata header as fallback', async () => {
         const accountId = '01a161f0-a4d7-7069-89e0-3e4ed4af4af8';
         const request: IRegisterSupplierRequest = {
            supplierName: 'Test Organic Farm',
            supplierCode: 'SUPP-TOF-2',
         };

         const mockMetadata = new Metadata();
         mockMetadata.set('x-account-id', accountId);

         const response$ = grpcController.registerSupplier(request, mockMetadata);
         const result = await firstValueFrom(response$);

         expect(result.supplier.supplierId).toBe('supp-0192e21b-0001');
      });

      it('should reject registration with UnauthorizedException when gRPC metadata is missing user context', () => {
         const request: IRegisterSupplierRequest = {
            supplierName: 'Unauthenticated Farm',
            supplierCode: 'SUPP-UNAUTH',
         };

         const emptyMetadata = new Metadata();
         expect(() => grpcController.registerSupplier(request, emptyMetadata)).toThrow(UnauthorizedException);
      });

      it('should reject getMySupplier with UnauthorizedException when neither accountId nor metadata is provided', () => {
         const emptyMetadata = new Metadata();
         expect(() => grpcController.getMySupplier({}, emptyMetadata)).toThrow(UnauthorizedException);
      });

      it('should successfully retrieve supplier profile when valid metadata is forwarded', async () => {
         const accountId = '01a161f0-a4d7-7069-89e0-3e4ed4af4af8';
         const mockMetadata = new Metadata();
         mockMetadata.set('x-user-id', accountId);

         // Add supplier & member to in-memory maps
         const supplierEntity = await mockSupplierRepo.create({
            supplierName: 'Profile Farm',
            supplierSlug: 'profile-farm',
            supplierCode: 'SUPP-PROF',
         });
         mockMembers.set(accountId, {
            memberId: 'mem-prof-1',
            accountId,
            supplierId: supplierEntity.supplierId,
            email: 'profile@farm.vn',
            role: SUPPLIER_ROLES.SUPPLIER_ADMIN,
            memberStatus: SUPPLIER_MEMBER_STATUS.ACTIVE,
            joinedAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
         });

         const response$ = grpcController.getMySupplier({}, mockMetadata);
         const result = await firstValueFrom(response$);

         expect(result.hasSupplier).toBe(true);
         expect(result.supplier?.supplierId).toBe(supplierEntity.supplierId);
         expect(result.role).toBe(SUPPLIER_ROLES.SUPPLIER_ADMIN);
      });
   });

   describe('Flow 2: Auth -> Supplier RabbitMQ SUPPLIER_REGISTERED Event Provisioning', () => {
      it('should provision supplier_members record when handling SUPPLIER_REGISTERED event', async () => {
         const eventPayload = {
            accountId: '01a161f0-a4d7-7069-89e0-3e4ed4af4af8',
            email: 'anhjkr+3@gmail.com',
            role: SUPPLIER_ROLES.SUPPLIER_ADMIN,
         };

         const mockRmqContext = {} as RmqContext;

         const result = await rmqController.handleSupplierRegistered(eventPayload, mockRmqContext);

         expect(result).toBeDefined();
         expect(result?.accountId).toBe(eventPayload.accountId);
         expect(result?.email).toBe(eventPayload.email);
         expect(result?.role).toBe(SUPPLIER_ROLES.SUPPLIER_ADMIN);
         expect(mockRmqService.ack).toHaveBeenCalledWith(mockRmqContext);

         // Confirm member is stored in repository
         const storedMember = mockMembers.get(eventPayload.accountId);
         expect(storedMember).toBeDefined();
         expect(storedMember?.email).toBe('anhjkr+3@gmail.com');
      });

      it('should handle duplicate SUPPLIER_REGISTERED events idempotently without throwing error', async () => {
         const eventPayload = {
            accountId: '01a161f0-a4d7-7069-89e0-3e4ed4af4af8',
            email: 'anhjkr+3@gmail.com',
            role: SUPPLIER_ROLES.SUPPLIER_ADMIN,
         };

         const mockRmqContext = {} as RmqContext;

         // First call
         await rmqController.handleSupplierRegistered(eventPayload, mockRmqContext);

         // Duplicate call
         const result = await rmqController.handleSupplierRegistered(eventPayload, mockRmqContext);

         expect(result).toBeDefined();
         expect(result?.accountId).toBe(eventPayload.accountId);
         expect(mockRmqService.ack).toHaveBeenCalledTimes(2);
      });
   });
});
