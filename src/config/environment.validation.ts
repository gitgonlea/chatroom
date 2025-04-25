import { plainToInstance } from 'class-transformer';
import { IsString, IsNumber, IsOptional, IsBoolean, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsString()
  @IsOptional()
  DB_HOST?: string;

  @IsNumber()
  @IsOptional()
  DB_PORT?: number;

  @IsString()
  @IsOptional()
  DB_USERNAME?: string;

  @IsString()
  @IsOptional()
  DB_PASSWORD?: string;

  @IsString()
  @IsOptional()
  DB_DATABASE?: string;

  @IsBoolean()
  @IsOptional()
  DB_SYNCHRONIZE?: boolean;

  @IsBoolean()
  @IsOptional()
  DB_LOGGING?: boolean;

  @IsNumber()
  @IsOptional()
  PORT?: number;
}

export function validateEnvironment(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(
    EnvironmentVariables,
    {
      DB_HOST: config.DB_HOST,
      DB_PORT: config.DB_PORT ? parseInt(config.DB_PORT as string, 10) : undefined,
      DB_USERNAME: config.DB_USERNAME,
      DB_PASSWORD: config.DB_PASSWORD,
      DB_DATABASE: config.DB_DATABASE,
      DB_SYNCHRONIZE: config.DB_SYNCHRONIZE === 'true',
      DB_LOGGING: config.DB_LOGGING === 'true',
      PORT: config.PORT ? parseInt(config.PORT as string, 10) : undefined,
    },
    { enableImplicitConversion: true },
  );

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}