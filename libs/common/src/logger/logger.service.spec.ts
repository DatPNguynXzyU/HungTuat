import { PinoLogger } from 'nestjs-pino';
import { AppLogger } from '@common/logger/logger.service';

describe('AppLogger', () => {
   let logger: AppLogger;

   const mockSetContext = jest.fn();
   const mockInfo = jest.fn();
   const mockError = jest.fn();
   const mockWarn = jest.fn();
   const mockDebug = jest.fn();
   const mockTrace = jest.fn();

   const pinoLoggerMock = {
      setContext: mockSetContext,
      info: mockInfo,
      error: mockError,
      warn: mockWarn,
      debug: mockDebug,
      trace: mockTrace,
   } as unknown as PinoLogger;

   beforeEach(() => {
      jest.clearAllMocks();
      logger = new AppLogger(pinoLoggerMock);
   });

   it('should be defined', () => {
      expect(logger).toBeDefined();
   });

   it('should delegate setContext to PinoLogger', () => {
      logger.setContext('TestContext');
      expect(mockSetContext).toHaveBeenCalledWith('TestContext');
   });

   it('should log info string', () => {
      logger.log('Hello info', 'TestContext');
      expect(mockSetContext).toHaveBeenCalledWith('TestContext');
      expect(mockInfo).toHaveBeenCalledWith('Hello info');
   });

   it('should log info object', () => {
      logger.log({ key: 'val' });
      expect(mockInfo).toHaveBeenCalledWith({ key: 'val' });
   });

   it('should log error string with trace', () => {
      logger.error('Error occurred', 'Trace stack', 'TestContext');
      expect(mockSetContext).toHaveBeenCalledWith('TestContext');
      expect(mockError).toHaveBeenCalledWith({ trace: 'Trace stack' }, 'Error occurred');
   });

   it('should log error object with trace', () => {
      logger.error({ error: 'details' }, 'Trace stack');
      expect(mockError).toHaveBeenCalledWith({ error: 'details', trace: 'Trace stack' });
   });

   it('should log warn', () => {
      logger.warn('Warning message');
      expect(mockWarn).toHaveBeenCalledWith('Warning message');
   });

   it('should log debug', () => {
      logger.debug('Debug message');
      expect(mockDebug).toHaveBeenCalledWith('Debug message');
   });

   it('should log verbose/trace', () => {
      logger.verbose('Verbose message');
      expect(mockTrace).toHaveBeenCalledWith('Verbose message');
   });
});
