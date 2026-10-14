import { PrismaClient } from '@auth/prisma-client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { DEFAULT_ROLES, PERMISSIONS, RbacRedisKeys, RBAC_REDIS_TTL } from '@common/constants';
import { validateAuthEnv } from '@auth/config/auth-env.schema';

const env = validateAuthEnv(process.env);
const connectionString = env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const permissionsData = [
   // Users
   { code: PERMISSIONS.USERS_READ, name: 'Read Users', description: 'View user profiles and details' },
   { code: PERMISSIONS.USERS_CREATE, name: 'Create Users', description: 'Create new user accounts' },
   { code: PERMISSIONS.USERS_UPDATE, name: 'Update Users', description: 'Update user profiles' },
   { code: PERMISSIONS.USERS_DELETE, name: 'Delete Users', description: 'Delete user accounts' },
   { code: PERMISSIONS.USERS_BAN, name: 'Ban Users', description: 'Ban or suspend user accounts' },

   // Roles & Permissions
   { code: PERMISSIONS.ROLES_READ, name: 'Read Roles', description: 'View system roles' },
   { code: PERMISSIONS.ROLES_CREATE, name: 'Create Roles', description: 'Create new roles' },
   { code: PERMISSIONS.ROLES_UPDATE, name: 'Update Roles', description: 'Update existing roles' },
   { code: PERMISSIONS.ROLES_DELETE, name: 'Delete Roles', description: 'Delete roles' },
   { code: PERMISSIONS.PERMISSIONS_READ, name: 'Read Permissions', description: 'View all permissions' },

   // Recipes
   { code: PERMISSIONS.RECIPES_READ, name: 'Read Recipes', description: 'Browse and view recipes' },
   { code: PERMISSIONS.RECIPES_CREATE, name: 'Create Recipes', description: 'Create and submit recipes' },
   { code: PERMISSIONS.RECIPES_UPDATE_OWN, name: 'Update Own Recipes', description: 'Edit own created recipes' },
   { code: PERMISSIONS.RECIPES_DELETE_OWN, name: 'Delete Own Recipes', description: 'Delete own created recipes' },
   {
      code: PERMISSIONS.RECIPES_PUBLISH,
      name: 'Publish Recipes',
      description: 'Directly publish recipes without moderation',
   },
   { code: PERMISSIONS.RECIPES_APPROVE, name: 'Approve Recipes', description: 'Approve pending submitted recipes' },
   { code: PERMISSIONS.RECIPES_DELETE_ANY, name: 'Delete Any Recipe', description: 'Delete any recipe for moderation' },

   // Videos
   { code: PERMISSIONS.VIDEOS_READ, name: 'Read Videos', description: 'Watch cooking tutorial videos' },
   { code: PERMISSIONS.VIDEOS_CREATE, name: 'Create Videos', description: 'Upload cooking video tutorials' },
   { code: PERMISSIONS.VIDEOS_UPDATE_OWN, name: 'Update Own Videos', description: 'Edit own video tutorials' },
   { code: PERMISSIONS.VIDEOS_DELETE_OWN, name: 'Delete Own Videos', description: 'Delete own video tutorials' },
   { code: PERMISSIONS.VIDEOS_APPROVE, name: 'Approve Videos', description: 'Approve pending video tutorials' },
   { code: PERMISSIONS.VIDEOS_DELETE_ANY, name: 'Delete Any Video', description: 'Delete any video for moderation' },

   // Comments & Reviews
   { code: PERMISSIONS.COMMENTS_READ, name: 'Read Comments', description: 'View recipe and video comments' },
   { code: PERMISSIONS.COMMENTS_CREATE, name: 'Create Comments', description: 'Post comments on recipes and videos' },
   { code: PERMISSIONS.COMMENTS_UPDATE_OWN, name: 'Update Own Comments', description: 'Edit own comments' },
   { code: PERMISSIONS.COMMENTS_DELETE_OWN, name: 'Delete Own Comments', description: 'Delete own comments' },
   { code: PERMISSIONS.COMMENTS_DELETE_ANY, name: 'Delete Any Comment', description: 'Delete inappropriate comments' },
   { code: PERMISSIONS.REVIEWS_CREATE, name: 'Create Reviews', description: 'Review and rate recipes' },
   { code: PERMISSIONS.REVIEWS_UPDATE_OWN, name: 'Update Own Reviews', description: 'Edit own recipe reviews' },
   { code: PERMISSIONS.REVIEWS_DELETE_OWN, name: 'Delete Own Reviews', description: 'Delete own recipe reviews' },

   // Cookbooks
   { code: PERMISSIONS.COOKBOOKS_READ, name: 'Read Cookbooks', description: 'View cookbooks and collections' },
   { code: PERMISSIONS.COOKBOOKS_CREATE, name: 'Create Cookbooks', description: 'Create personal cookbooks' },
   { code: PERMISSIONS.COOKBOOKS_UPDATE_OWN, name: 'Update Own Cookbooks', description: 'Edit own cookbooks' },
   { code: PERMISSIONS.COOKBOOKS_DELETE_OWN, name: 'Delete Own Cookbooks', description: 'Delete own cookbooks' },

   // Categories & Ingredients
   { code: PERMISSIONS.CATEGORIES_READ, name: 'Read Categories', description: 'Browse recipe categories' },
   { code: PERMISSIONS.CATEGORIES_CREATE, name: 'Create Categories', description: 'Add new recipe categories' },
   { code: PERMISSIONS.CATEGORIES_UPDATE, name: 'Update Categories', description: 'Edit recipe categories' },
   { code: PERMISSIONS.CATEGORIES_DELETE, name: 'Delete Categories', description: 'Remove recipe categories' },
   { code: PERMISSIONS.INGREDIENTS_READ, name: 'Read Ingredients', description: 'Browse ingredient dictionary' },
   { code: PERMISSIONS.INGREDIENTS_CREATE, name: 'Create Ingredients', description: 'Suggest or add ingredients' },
   { code: PERMISSIONS.INGREDIENTS_UPDATE, name: 'Update Ingredients', description: 'Edit ingredients' },
   { code: PERMISSIONS.INGREDIENTS_DELETE, name: 'Delete Ingredients', description: 'Delete ingredients' },

   // Moderation & Reports
   { code: PERMISSIONS.MODERATION_READ, name: 'Read Moderation Queue', description: 'View content moderation queue' },
   { code: PERMISSIONS.MODERATION_APPROVE, name: 'Approve Content', description: 'Approve submitted content' },
   { code: PERMISSIONS.MODERATION_REJECT, name: 'Reject Content', description: 'Reject submitted content' },
   { code: PERMISSIONS.REPORTS_READ, name: 'Read Reports', description: 'View reported content and users' },
   { code: PERMISSIONS.REPORTS_RESOLVE, name: 'Resolve Reports', description: 'Resolve moderation reports' },
];

const rolesDefinition = [
   {
      code: DEFAULT_ROLES.SUPER_ADMIN,
      name: 'Super Administrator',
      description: 'Full access to all system features and administration',
      permissions: Object.values(PERMISSIONS),
   },
   {
      code: DEFAULT_ROLES.ADMIN,
      name: 'Administrator',
      description: 'System administrator for users, content, and category management',
      permissions: [
         PERMISSIONS.USERS_READ,
         PERMISSIONS.USERS_CREATE,
         PERMISSIONS.USERS_UPDATE,
         PERMISSIONS.USERS_DELETE,
         PERMISSIONS.USERS_BAN,
         PERMISSIONS.ROLES_READ,
         PERMISSIONS.PERMISSIONS_READ,
         PERMISSIONS.RECIPES_READ,
         PERMISSIONS.RECIPES_CREATE,
         PERMISSIONS.RECIPES_UPDATE_OWN,
         PERMISSIONS.RECIPES_DELETE_OWN,
         PERMISSIONS.RECIPES_PUBLISH,
         PERMISSIONS.RECIPES_APPROVE,
         PERMISSIONS.RECIPES_DELETE_ANY,
         PERMISSIONS.VIDEOS_READ,
         PERMISSIONS.VIDEOS_CREATE,
         PERMISSIONS.VIDEOS_UPDATE_OWN,
         PERMISSIONS.VIDEOS_DELETE_OWN,
         PERMISSIONS.VIDEOS_APPROVE,
         PERMISSIONS.VIDEOS_DELETE_ANY,
         PERMISSIONS.COMMENTS_READ,
         PERMISSIONS.COMMENTS_CREATE,
         PERMISSIONS.COMMENTS_UPDATE_OWN,
         PERMISSIONS.COMMENTS_DELETE_OWN,
         PERMISSIONS.COMMENTS_DELETE_ANY,
         PERMISSIONS.REVIEWS_CREATE,
         PERMISSIONS.REVIEWS_UPDATE_OWN,
         PERMISSIONS.REVIEWS_DELETE_OWN,
         PERMISSIONS.COOKBOOKS_READ,
         PERMISSIONS.COOKBOOKS_CREATE,
         PERMISSIONS.COOKBOOKS_UPDATE_OWN,
         PERMISSIONS.COOKBOOKS_DELETE_OWN,
         PERMISSIONS.CATEGORIES_READ,
         PERMISSIONS.CATEGORIES_CREATE,
         PERMISSIONS.CATEGORIES_UPDATE,
         PERMISSIONS.CATEGORIES_DELETE,
         PERMISSIONS.INGREDIENTS_READ,
         PERMISSIONS.INGREDIENTS_CREATE,
         PERMISSIONS.INGREDIENTS_UPDATE,
         PERMISSIONS.INGREDIENTS_DELETE,
         PERMISSIONS.MODERATION_READ,
         PERMISSIONS.MODERATION_APPROVE,
         PERMISSIONS.MODERATION_REJECT,
         PERMISSIONS.REPORTS_READ,
         PERMISSIONS.REPORTS_RESOLVE,
      ],
   },
   {
      code: DEFAULT_ROLES.MODERATOR,
      name: 'Content Moderator',
      description: 'Community moderator responsible for reviewing recipes, videos, comments and handling reports',
      permissions: [
         PERMISSIONS.USERS_READ,
         PERMISSIONS.USERS_BAN,
         PERMISSIONS.RECIPES_READ,
         PERMISSIONS.RECIPES_APPROVE,
         PERMISSIONS.RECIPES_DELETE_ANY,
         PERMISSIONS.VIDEOS_READ,
         PERMISSIONS.VIDEOS_APPROVE,
         PERMISSIONS.VIDEOS_DELETE_ANY,
         PERMISSIONS.COMMENTS_READ,
         PERMISSIONS.COMMENTS_DELETE_ANY,
         PERMISSIONS.CATEGORIES_READ,
         PERMISSIONS.INGREDIENTS_READ,
         PERMISSIONS.MODERATION_READ,
         PERMISSIONS.MODERATION_APPROVE,
         PERMISSIONS.MODERATION_REJECT,
         PERMISSIONS.REPORTS_READ,
         PERMISSIONS.REPORTS_RESOLVE,
      ],
   },
   {
      code: DEFAULT_ROLES.CHEF,
      name: 'Verified Chef & Creator',
      description: 'Verified chef with direct publishing rights, video uploads and cookbook authoring',
      permissions: [
         PERMISSIONS.USERS_READ,
         PERMISSIONS.USERS_UPDATE,
         PERMISSIONS.RECIPES_READ,
         PERMISSIONS.RECIPES_CREATE,
         PERMISSIONS.RECIPES_UPDATE_OWN,
         PERMISSIONS.RECIPES_DELETE_OWN,
         PERMISSIONS.RECIPES_PUBLISH,
         PERMISSIONS.VIDEOS_READ,
         PERMISSIONS.VIDEOS_CREATE,
         PERMISSIONS.VIDEOS_UPDATE_OWN,
         PERMISSIONS.VIDEOS_DELETE_OWN,
         PERMISSIONS.COMMENTS_READ,
         PERMISSIONS.COMMENTS_CREATE,
         PERMISSIONS.COMMENTS_UPDATE_OWN,
         PERMISSIONS.COMMENTS_DELETE_OWN,
         PERMISSIONS.REVIEWS_CREATE,
         PERMISSIONS.REVIEWS_UPDATE_OWN,
         PERMISSIONS.REVIEWS_DELETE_OWN,
         PERMISSIONS.COOKBOOKS_READ,
         PERMISSIONS.COOKBOOKS_CREATE,
         PERMISSIONS.COOKBOOKS_UPDATE_OWN,
         PERMISSIONS.COOKBOOKS_DELETE_OWN,
         PERMISSIONS.CATEGORIES_READ,
         PERMISSIONS.INGREDIENTS_READ,
         PERMISSIONS.INGREDIENTS_CREATE,
      ],
   },
   {
      code: DEFAULT_ROLES.USER,
      name: 'Standard User',
      description:
         'Standard community member who can browse, create personal recipes, comment, review and save cookbooks',
      permissions: [
         PERMISSIONS.USERS_READ,
         PERMISSIONS.USERS_UPDATE,
         PERMISSIONS.RECIPES_READ,
         PERMISSIONS.RECIPES_CREATE,
         PERMISSIONS.RECIPES_UPDATE_OWN,
         PERMISSIONS.RECIPES_DELETE_OWN,
         PERMISSIONS.VIDEOS_READ,
         PERMISSIONS.COMMENTS_READ,
         PERMISSIONS.COMMENTS_CREATE,
         PERMISSIONS.COMMENTS_UPDATE_OWN,
         PERMISSIONS.COMMENTS_DELETE_OWN,
         PERMISSIONS.REVIEWS_CREATE,
         PERMISSIONS.REVIEWS_UPDATE_OWN,
         PERMISSIONS.REVIEWS_DELETE_OWN,
         PERMISSIONS.COOKBOOKS_READ,
         PERMISSIONS.COOKBOOKS_CREATE,
         PERMISSIONS.COOKBOOKS_UPDATE_OWN,
         PERMISSIONS.COOKBOOKS_DELETE_OWN,
         PERMISSIONS.CATEGORIES_READ,
         PERMISSIONS.INGREDIENTS_READ,
      ],
   },
];

async function seedRedis(
   rolesWithPermissions: Array<{
      id: string;
      code: string;
      name: string;
      description: string | null;
      permissions: string[];
   }>,
): Promise<void> {
   const redisHost = env.REDIS_HOST;
   const redisPort = env.REDIS_PORT;
   const redisPassword = env.REDIS_PASSWORD || undefined;

   let redis: Redis | null = null;
   try {
      redis = new Redis({
         host: redisHost,
         port: redisPort,
         password: redisPassword,
         lazyConnect: true,
         maxRetriesPerRequest: 1,
      });
      await redis.connect();

      for (const role of rolesWithPermissions) {
         const roleKey = RbacRedisKeys.role(role.code);
         const permissionsKey = RbacRedisKeys.rolePermissions(role.code);
         await redis.set(roleKey, JSON.stringify(role), 'EX', RBAC_REDIS_TTL.DEFAULT_ROLE);
         await redis.set(permissionsKey, JSON.stringify(role.permissions), 'EX', RBAC_REDIS_TTL.ROLE_PERMISSIONS);
      }
      console.log('✔ Redis cache pre-warmed successfully for all roles and permissions');
   } catch (err: unknown) {
      const error = err as Error;
      console.warn(`[Warning] Could not pre-warm Redis cache (is Redis running?): ${error.message}`);
   } finally {
      if (redis) {
         await redis.quit().catch(() => {});
      }
   }
}

async function main() {
   console.log('Seeding cooking network permissions...');
   const permissionMap = new Map<string, string>();

   for (const perm of permissionsData) {
      const created = await prisma.permission.upsert({
         where: { code: perm.code },
         update: { name: perm.name, description: perm.description },
         create: { code: perm.code, name: perm.name, description: perm.description },
      });
      permissionMap.set(perm.code, created.permissionId);
   }

   console.log('Seeding cooking network roles...');
   const seededRoles: Array<{
      id: string;
      code: string;
      name: string;
      description: string | null;
      permissions: string[];
   }> = [];

   for (const roleDef of rolesDefinition) {
      const role = await prisma.role.upsert({
         where: { code: roleDef.code },
         update: { name: roleDef.name, description: roleDef.description },
         create: { code: roleDef.code, name: roleDef.name, description: roleDef.description },
      });

      for (const permCode of roleDef.permissions) {
         const permissionId = permissionMap.get(permCode);
         if (permissionId) {
            await prisma.rolePermission.upsert({
               where: {
                  roleId_permissionId: {
                     roleId: role.roleId,
                     permissionId,
                  },
               },
               update: {},
               create: {
                  roleId: role.roleId,
                  permissionId,
               },
            });
         }
      }

      seededRoles.push({
         id: role.roleId,
         code: role.code,
         name: role.name,
         description: role.description,
         permissions: roleDef.permissions,
      });
   }

   console.log('Pre-warming Redis cache with roles & permissions...');
   await seedRedis(seededRoles);

   console.log('✔ Cooking network RBAC seeding completed successfully!');
}

main()
   .catch((e) => {
      console.error(e);
      process.exit(1);
   })
   .finally(async () => {
      await prisma.$disconnect();
      await pool.end();
   });
