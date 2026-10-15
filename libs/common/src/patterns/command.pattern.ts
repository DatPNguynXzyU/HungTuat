import { Injectable, Logger, type Type } from '@nestjs/common';

export abstract class Command<TResult = unknown> {
   /**
    * Phantom property used for TypeScript return type inference.
    * It never holds an actual runtime value.
    */
   declare readonly _resultType?: TResult;
}

export type ICommand<TResult = unknown> = Command<TResult>;

export interface ICommandHandler<TCommand extends Command<unknown> = Command<unknown>, TResult = unknown> {
   execute(command: TCommand): Promise<TResult> | TResult;
}

export type CommandType<TCommand extends Command<unknown> = Command<unknown>> = Type<TCommand>;

export const COMMAND_HANDLER_METADATA = '__commandHandler__';

/**
 * Decorator to mark a class as a handler for a specific command type.
 */
export const CommandHandler = (command: CommandType): ClassDecorator => {
   return (target: object) => {
      Reflect.defineMetadata(COMMAND_HANDLER_METADATA, command, target);
   };
};

export class CommandHandlerNotFoundError extends Error {
   constructor(commandName: string) {
      super(`No handler registered for command: "${commandName}"`);
      this.name = 'CommandHandlerNotFoundError';
   }
}

export type CommandMiddleware = (command: Command<unknown>, next: () => Promise<unknown>) => Promise<unknown>;

export interface ICommandBus {
   execute<TResult>(command: Command<TResult>): Promise<TResult>;
   register<TCommand extends Command<unknown>, TResult>(
      commandType: CommandType<TCommand>,
      handler: ICommandHandler<TCommand, TResult>,
   ): void;
   registerHandler(handler: ICommandHandler<Command<unknown>, unknown>): void;
   registerHandlers(handlers: ICommandHandler<Command<unknown>, unknown>[]): void;
}

export const COMMAND_BUS = Symbol('COMMAND_BUS');

@Injectable()
export class CommandBus implements ICommandBus {
   private readonly logger = new Logger(CommandBus.name);
   private readonly handlers = new Map<string, ICommandHandler<Command<unknown>, unknown>>();
   private readonly middlewares: CommandMiddleware[] = [];

   /**
    * Register a specific command type with its corresponding handler.
    */
   register<TCommand extends Command<unknown>, TResult>(
      commandType: CommandType<TCommand>,
      handler: ICommandHandler<TCommand, TResult>,
   ): void {
      const commandName = commandType.name;
      this.handlers.set(commandName, handler);
      this.logger.debug(`Registered handler "${handler.constructor.name}" for command "${commandName}"`);
   }

   /**
    * Automatically register a handler using metadata attached by the @CommandHandler decorator.
    */
   registerHandler(handler: ICommandHandler<Command<unknown>, unknown>): void {
      const commandType = Reflect.getMetadata(COMMAND_HANDLER_METADATA, handler.constructor) as CommandType | undefined;

      if (!commandType) {
         throw new Error(`Cannot register handler "${handler.constructor.name}": Missing @CommandHandler decorator`);
      }

      this.register(commandType, handler);
   }

   /**
    * Register multiple handlers at once.
    */
   registerHandlers(handlers: ICommandHandler<Command<unknown>, unknown>[]): void {
      for (const handler of handlers) {
         this.registerHandler(handler);
      }
   }

   /**
    * Add middleware to intercept command execution pipeline.
    */
   use(middleware: CommandMiddleware): this {
      this.middlewares.push(middleware);
      return this;
   }

   /**
    * Execute the command through the registered handler and middleware pipeline.
    */
   async execute<TResult>(command: Command<TResult>): Promise<TResult> {
      const commandName = command.constructor.name;
      const handler = this.handlers.get(commandName);

      if (!handler) {
         this.logger.error(`CommandHandlerNotFoundError: No handler registered for command "${commandName}"`);
         throw new CommandHandlerNotFoundError(commandName);
      }

      const executePipeline = async (index: number): Promise<unknown> => {
         if (index < this.middlewares.length) {
            const nextMiddleware = this.middlewares[index];
            return nextMiddleware(command, () => executePipeline(index + 1));
         }
         return handler.execute(command);
      };

      return (await executePipeline(0)) as TResult;
   }
}
