import { Controller } from '@nestjs/common';
import { TaskerService } from './tasker.service';

@Controller('tasker')
export class TaskerController {
  constructor(private readonly taskerService: TaskerService) {}
}
