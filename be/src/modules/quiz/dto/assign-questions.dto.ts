import { IsArray, IsInt, IsOptional, IsUUID, ArrayMinSize, Min } from 'class-validator';

export class AssignQuestionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  questionIds: string[];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  orderIndexes?: number[];
}
