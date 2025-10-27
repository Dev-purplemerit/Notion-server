import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Blog, BlogDocument } from './blog.schema';
import { Comment, CommentDocument } from './comment.schema';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { User, UserDocument } from '../users/users.schema';
import { UsersService } from '../users/users.service';

@Injectable()
export class BlogService {
  constructor(
    @InjectModel(Blog.name) private blogModel: Model<BlogDocument>,
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private usersService: UsersService,
  ) {}

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  async createBlog(createBlogDto: CreateBlogDto, userEmail: string): Promise<Blog> {
    // Get user ID from email
    const userId = await this.usersService.getUserIdFromEmail(userEmail);
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const slug = this.generateSlug(createBlogDto.title);

    // Check if slug already exists
    let finalSlug = slug;
    let counter = 1;
    while (await this.blogModel.findOne({ slug: finalSlug })) {
      finalSlug = `${slug}-${counter}`;
      counter++;
    }

    const blog = new this.blogModel({
      ...createBlogDto,
      slug: finalSlug,
      author: new Types.ObjectId(userId),
      publishedAt: createBlogDto.status === 'published' ? new Date() : null,
    });

    return blog.save();
  }

  async findAll(filter?: { status?: string; author?: string }): Promise<any[]> {
    const query: any = {};

    if (filter?.status) {
      query.status = filter.status;
    }

    if (filter?.author) {
      query.author = new Types.ObjectId(filter.author);
    }

    const blogs = await this.blogModel
      .find(query)
      .populate('author', 'name email avatar')
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    // Add comment count to each blog
    const blogsWithCommentCount = await Promise.all(
      blogs.map(async (blog) => {
        const commentCount = await this.commentModel.countDocuments({
          postId: blog._id,
          isDeleted: false
        });
        return {
          ...blog,
          comments: commentCount,
        };
      })
    );

    return blogsWithCommentCount;
  }

  async findBySlug(slug: string): Promise<Blog> {
    const blog = await this.blogModel
      .findOne({ slug })
      .populate('author', 'name email avatar')
      .exec();

    if (!blog) {
      throw new NotFoundException(`Blog with slug ${slug} not found`);
    }

    // Increment view count
    blog.viewCount += 1;
    await blog.save();

    return blog;
  }

  async findById(id: string): Promise<Blog> {
    const blog = await this.blogModel
      .findById(id)
      .populate('author', 'name email avatar')
      .exec();

    if (!blog) {
      throw new NotFoundException(`Blog with ID ${id} not found`);
    }

    return blog;
  }

  async updateBlog(id: string, updateBlogDto: UpdateBlogDto, userEmail: string): Promise<Blog> {
    // Get user ID from email
    const userId = await this.usersService.getUserIdFromEmail(userEmail);
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const blog = await this.blogModel.findById(id);

    if (!blog) {
      throw new NotFoundException(`Blog with ID ${id} not found`);
    }

    if (blog.author.toString() !== userId) {
      throw new ForbiddenException('You can only update your own blogs');
    }

    // Check if title is being updated
    const dtoWithTitle = updateBlogDto as any;
    if (dtoWithTitle.title && dtoWithTitle.title !== blog.title) {
      blog.slug = this.generateSlug(dtoWithTitle.title);
    }

    // Check if status is being changed to published
    const dtoWithStatus = updateBlogDto as any;
    if (dtoWithStatus.status === 'published' && blog.status === 'draft') {
      blog.publishedAt = new Date();
    }

    Object.assign(blog, updateBlogDto);
    return blog.save();
  }

  async deleteBlog(id: string, userEmail: string): Promise<void> {
    // Get user ID from email
    const userId = await this.usersService.getUserIdFromEmail(userEmail);
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const blog = await this.blogModel.findById(id);

    if (!blog) {
      throw new NotFoundException(`Blog with ID ${id} not found`);
    }

    // Allow admin to delete any post
    const user = await this.userModel.findById(userId);

    if (user && user.role === 'admin') {
      await blog.deleteOne();
      await this.commentModel.deleteMany({ postId: id });
      return;
    }

    if (blog.author.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own blogs');
    }

    await blog.deleteOne();

    // Delete all comments
    await this.commentModel.deleteMany({ postId: id });
  }

  // Comment methods
  async createComment(postId: string, createCommentDto: CreateCommentDto, userEmail: string): Promise<Comment> {
    // Get user ID from email
    const userId = await this.usersService.getUserIdFromEmail(userEmail);
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const blog = await this.blogModel.findById(postId);

    if (!blog) {
      throw new NotFoundException(`Blog with ID ${postId} not found`);
    }

    const comment = new this.commentModel({
      postId: new Types.ObjectId(postId),
      author: new Types.ObjectId(userId),
      content: createCommentDto.content,
      parentComment: createCommentDto.parentComment
        ? new Types.ObjectId(createCommentDto.parentComment)
        : null,
    });

    return comment.save();
  }

  async getComments(postId: string): Promise<Comment[]> {
    return this.commentModel
      .find({ postId: new Types.ObjectId(postId), isDeleted: false })
      .populate('author', 'name email avatar')
      .populate('parentComment')
      .sort({ createdAt: -1 })
      .exec();
  }

  async deleteComment(commentId: string, userEmail: string): Promise<void> {
    // Get user ID from email
    const userId = await this.usersService.getUserIdFromEmail(userEmail);
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const comment = await this.commentModel.findById(commentId);

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    if (comment.author.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    comment.isDeleted = true;
    await comment.save();
  }

  async searchBlogs(query: string): Promise<Blog[]> {
    return this.blogModel
      .find({
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { content: { $regex: query, $options: 'i' } },
          { tags: { $in: [new RegExp(query, 'i')] } },
        ],
        status: 'published',
      })
      .populate('author', 'name email avatar')
      .limit(20)
      .exec();
  }

  async toggleLike(blogId: string, userEmail: string): Promise<{ liked: boolean; likesCount: number }> {
    // Get user ID from email
    const userId = await this.usersService.getUserIdFromEmail(userEmail);
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const blog = await this.blogModel.findById(blogId);

    if (!blog) {
      throw new NotFoundException(`Blog with ID ${blogId} not found`);
    }

    const userObjectId = new Types.ObjectId(userId);
    const likeIndex = blog.likes.findIndex(id => id.toString() === userId);

    if (likeIndex > -1) {
      // User already liked, so unlike
      blog.likes.splice(likeIndex, 1);
      await blog.save();
      return { liked: false, likesCount: blog.likes.length };
    } else {
      // User hasn't liked, so like
      blog.likes.push(userObjectId);
      await blog.save();
      return { liked: true, likesCount: blog.likes.length };
    }
  }
}
