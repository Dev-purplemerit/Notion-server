import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { BlogService } from './blog.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { AwsS3Service } from '../aws/aws-s3.service';

@Controller('blog')
export class BlogController {
  constructor(
    private readonly blogService: BlogService,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createBlog(@Body() createBlogDto: CreateBlogDto, @Request() req) {
    return this.blogService.createBlog(createBlogDto, req.user.email);
  }

  @Post('upload-image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      return { error: 'No file uploaded' };
    }

    const url = await this.awsS3Service.uploadFile(file);
    return { url };
  }

  @Get()
  async getAllBlogs(@Query('status') status?: string, @Query('author') author?: string) {
    return this.blogService.findAll({ status, author });
  }

  @Get('search')
  async searchBlogs(@Query('q') query: string) {
    return this.blogService.searchBlogs(query);
  }

  @Get(':slug')
  async getBlogBySlug(@Param('slug') slug: string) {
    return this.blogService.findBySlug(slug);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async updateBlog(
    @Param('id') id: string,
    @Body() updateBlogDto: UpdateBlogDto,
    @Request() req,
  ) {
    return this.blogService.updateBlog(id, updateBlogDto, req.user.email);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteBlog(@Param('id') id: string, @Request() req) {
    await this.blogService.deleteBlog(id, req.user.email);
    return { message: 'Blog deleted successfully' };
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  async toggleLike(@Param('id') id: string, @Request() req) {
    return this.blogService.toggleLike(id, req.user.email);
  }

  // Comments
  @Post(':id/comments')
  @UseGuards(JwtAuthGuard)
  async createComment(
    @Param('id') postId: string,
    @Body() createCommentDto: CreateCommentDto,
    @Request() req,
  ) {
    return this.blogService.createComment(postId, createCommentDto, req.user.email);
  }

  @Get(':id/comments')
  async getComments(@Param('id') postId: string) {
    return this.blogService.getComments(postId);
  }

  @Delete('comments/:id')
  @UseGuards(JwtAuthGuard)
  async deleteComment(@Param('id') commentId: string, @Request() req) {
    await this.blogService.deleteComment(commentId, req.user.email);
    return { message: 'Comment deleted successfully' };
  }
}
