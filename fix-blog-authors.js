// Run this script to fix blog post author IDs
// Usage: node fix-blog-authors.js <your-email>

require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGODB_URI;
const userEmail = process.argv[2];

if (!MONGO_URI) {
  console.error('MONGO_URI not found in .env file');
  process.exit(1);
}

if (!userEmail) {
  console.error('Please provide your email: node fix-blog-authors.js your@email.com');
  process.exit(1);
}

const BlogSchema = new mongoose.Schema({}, { strict: false });
const UserSchema = new mongoose.Schema({}, { strict: false });

const Blog = mongoose.model('Blog', BlogSchema, 'blogs');
const User = mongoose.model('User', UserSchema, 'users');

async function fixBlogAuthors() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Find user by email
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      console.error(`User with email ${userEmail} not found`);
      process.exit(1);
    }

    console.log(`Found user: ${user.name} (${user._id})`);

    // Find all blogs by this email's user
    const blogs = await Blog.find({});
    console.log(`\nTotal blogs in database: ${blogs.length}`);

    // Ask user which blogs to reassign
    console.log('\nBlogs that might need fixing:');
    const blogsToFix = [];

    for (const blog of blogs) {
      if (blog.author.toString() !== user._id.toString()) {
        blogsToFix.push(blog);
        console.log(`- "${blog.title}" (ID: ${blog._id})`);
        console.log(`  Current author ID: ${blog.author}`);
      }
    }

    if (blogsToFix.length === 0) {
      console.log('\n✓ All blogs already have correct author ID!');
      process.exit(0);
    }

    console.log(`\n${blogsToFix.length} blogs need to be updated.`);
    console.log(`This will change their author to: ${user.name} (${user._id})`);
    console.log('\nTo confirm, run:');
    console.log(`node fix-blog-authors.js ${userEmail} --confirm`);

    if (process.argv[3] === '--confirm') {
      console.log('\nUpdating blogs...');

      for (const blog of blogsToFix) {
        await Blog.updateOne(
          { _id: blog._id },
          { $set: { author: user._id } }
        );
        console.log(`✓ Updated: "${blog.title}"`);
      }

      console.log(`\n✓ Successfully updated ${blogsToFix.length} blogs!`);
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

fixBlogAuthors();
