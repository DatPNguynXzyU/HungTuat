import {
   Command,
   CommandBus,
   CommandHandler,
   CommandHandlerNotFoundError,
   type ICommandHandler,
} from '@common/patterns/command.pattern';

class TestGreetCommand extends Command<string> {
   constructor(public readonly name: string) {
      super();
   }
}

class TestAddCommand extends Command<number> {
   constructor(
      public readonly a: number,
      public readonly b: number,
   ) {
      super();
   }
}

class UnhandledCommand extends Command<void> {}

@CommandHandler(TestGreetCommand)
class TestGreetHandler implements ICommandHandler<TestGreetCommand, string> {
   execute(command: TestGreetCommand): string {
      return `Hello, ${command.name}!`;
   }
}

@CommandHandler(TestAddCommand)
class TestAddHandler implements ICommandHandler<TestAddCommand, number> {
   async execute(command: TestAddCommand): Promise<number> {
      await Promise.resolve();
      return command.a + command.b;
   }
}

class MissingDecoratorHandler implements ICommandHandler<UnhandledCommand, void> {
   execute(): void {}
}

describe('CommandBus & Command Pattern', () => {
   let commandBus: CommandBus;

   beforeEach(() => {
      commandBus = new CommandBus();
   });

   it('should register handler and execute synchronous command', async () => {
      commandBus.register(TestGreetCommand, new TestGreetHandler());

      const result = await commandBus.execute(new TestGreetCommand('Alice'));
      expect(result).toBe('Hello, Alice!');
   });

   it('should register handler and execute asynchronous command', async () => {
      commandBus.register(TestAddCommand, new TestAddHandler());

      const result = await commandBus.execute(new TestAddCommand(10, 20));
      expect(result).toBe(30);
   });

   it('should register handler automatically using decorator metadata', async () => {
      commandBus.registerHandler(new TestGreetHandler());

      const result = await commandBus.execute(new TestGreetCommand('Bob'));
      expect(result).toBe('Hello, Bob!');
   });

   it('should throw error when registering handler without decorator metadata', () => {
      expect(() => {
         commandBus.registerHandler(new MissingDecoratorHandler());
      }).toThrow('Missing @CommandHandler decorator');
   });

   it('should throw CommandHandlerNotFoundError when executing unregistered command', async () => {
      await expect(commandBus.execute(new UnhandledCommand())).rejects.toThrow(CommandHandlerNotFoundError);
      await expect(commandBus.execute(new UnhandledCommand())).rejects.toThrow(
         'No handler registered for command: "UnhandledCommand"',
      );
   });

   it('should pass command through middleware pipeline in correct order', async () => {
      const executionTrace: string[] = [];

      commandBus.use(async (command, next) => {
         executionTrace.push('middleware1:before');
         const res = await next();
         executionTrace.push('middleware1:after');
         return res;
      });

      commandBus.use(async (command, next) => {
         executionTrace.push('middleware2:before');
         const res = await next();
         executionTrace.push('middleware2:after');
         return res;
      });

      commandBus.register(TestGreetCommand, {
         execute: (cmd: TestGreetCommand) => {
            executionTrace.push(`handler:${cmd.name}`);
            return `Hi, ${cmd.name}`;
         },
      });

      const result = await commandBus.execute(new TestGreetCommand('Charlie'));
      expect(result).toBe('Hi, Charlie');
      expect(executionTrace).toEqual([
         'middleware1:before',
         'middleware2:before',
         'handler:Charlie',
         'middleware2:after',
         'middleware1:after',
      ]);
   });
});
