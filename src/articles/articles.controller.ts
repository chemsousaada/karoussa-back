import { Controller, Get, Query } from '@nestjs/common';
import { ArticlesService } from './articles.service';

@Controller('api/mock')
export class ArticlesController {
  constructor(private articlesService: ArticlesService) {}

  @Get('articles')
  async getArticles(@Query() query: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    return this.articlesService.findAll(page, limit);
  }
}
