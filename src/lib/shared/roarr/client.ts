import { Roarr, logLevels, type LogLevelName } from 'roarr';
import callsites from 'callsites';
import { config } from '$lib/server/core/config';
import type { JsonObject, LoggerLoggingMethodName } from './types';

export const roarr = (function () {
  const createLogger = (methodName: LoggerLoggingMethodName) => {
    return (message: string, context: JsonObject = {}) => {
      if (!shouldBeLogged(methodName)) {
        return;
      }

      Roarr[methodName](
        config.roarr.isDebugContextShown
          ? enrichContextWithDebugInfo(context)
          : context,
        message,
      );
    };
  };

  const roarrLoggingMethodNamesNoOnce = Object.keys(Roarr).filter((property) =>
    Object.keys(logLevels).includes(property),
  ) as LoggerLoggingMethodName[];
  const roarrLoggingMethodNamesOnce = roarrLoggingMethodNamesNoOnce.map(
    (methodName) => `${methodName}Once` as LoggerLoggingMethodName,
  );
  const roarrLoggingMethodNames = [
    ...roarrLoggingMethodNamesNoOnce,
    ...roarrLoggingMethodNamesOnce,
  ];
  const roarrLogger = roarrLoggingMethodNames.reduce(
    (acc, methodName) => {
      acc[methodName] = createLogger(methodName);
      return acc;
    },
    {} as Record<
      LoggerLoggingMethodName,
      (message: string, context?: JsonObject) => void
    >,
  );

  return roarrLogger;
})();

function shouldBeLogged(methodName: LoggerLoggingMethodName): boolean {
  const requestedLogLevelName = methodName.replace('Once', '') as LogLevelName;
  const requestedLogLevel = logLevels[requestedLogLevelName];
  const minLogLevel = logLevels[config.roarr.minLogLevel as LogLevelName];

  return requestedLogLevel >= minLogLevel;
}

function enrichContextWithDebugInfo(override: JsonObject = {}): JsonObject {
  return {
    callName: getCallName(),
    fileName: getFileName(),
    ...override,
  };
}

function getCallName(): string {
  const typeName = callsites()[3]?.getTypeName() ?? '';
  const functionName =
    callsites()[3]?.getFunctionName() ?? callsites()[3]?.getMethodName() ?? '';

  if (typeName) {
    return `${typeName}.${functionName}`;
  }

  return functionName;
}

function getFileName(): string {
  const fileName =
    callsites()[3]?.getFileName() ?? callsites()[3]?.getEvalOrigin() ?? '';

  return fileName.replace(config.folders.root, '');
}
