import { IsArray, IsUUID, ArrayMinSize } from 'class-validator';

export class ReorderQuestionsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  orderedQuestionIds: string[];
}
