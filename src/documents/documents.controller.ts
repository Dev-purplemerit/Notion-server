import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { AwsS3Service } from '../aws/aws-s3.service';

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly awsS3Service: AwsS3Service,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File, @Request() req) {
    if (!file) {
      return { error: 'No file uploaded' };
    }

    const url = await this.awsS3Service.uploadFile(file);

    return {
      url,
      fileName: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
    };
  }

  @Post()
  async create(@Body() createDocumentDto: CreateDocumentDto, @Request() req) {
    return this.documentsService.create(createDocumentDto, req.user.email);
  }

  @Get()
  async findAll(@Request() req, @Query('teamId') teamId?: string) {
    return this.documentsService.findAll(req.user.email, teamId);
  }

  @Get('team/:teamId')
  async findByTeam(@Param('teamId') teamId: string) {
    return this.documentsService.findByTeam(teamId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    return this.documentsService.findOne(id, req.user.email);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @Request() req,
  ) {
    return this.documentsService.update(id, updateDocumentDto, req.user.email);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    await this.documentsService.delete(id, req.user.email);
    return { message: 'Document deleted successfully' };
  }
}
