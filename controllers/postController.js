const Post = require('../modals/postModal');
const FeaturedPost = require('../modals/featuredPost');
const cloudinary = require('../cloud');
const { isValidObjectId } = require('mongoose');
const featuredPost = require('../modals/featuredPost');

const FEATURED_POST_COUNT = 4;
const addToFeaturedPost = async (postId) => {

    const isAlreadyExists = await FeaturedPost.findOne({ post: postId });
    if (isAlreadyExists) return;

    const featuredPost = new FeaturedPost({ post: postId });
    await featuredPost.save();

    const featuredPosts = await FeaturedPost.find({}).sort({ createdAt: -1 });

    featuredPosts.forEach(async (post, index) => {
        if (index >= FEATURED_POST_COUNT) {
            // console.log(index);
            // console.log(post._id);
            await FeaturedPost.findByIdAndDelete(post._id);
        }
    })
}
const removeFromFeaturedPost = async (postId) => {

    await FeaturedPost.findOneAndDelete({ post: postId });

}

const isFeaturedPost = async (postId) => {
    const post = await featuredPost.findOne({ post: postId });
    return post ? true : false;
}

exports.createPost = async (req, res, next) => {
    // console.log((req.body));
    const { file } = req;
    const { title, content, meta, tags, slug, author, featured } = req.body;
    const isAlreadyExists = await Post.findOne({ slug });
    if (isAlreadyExists) return res.status(401).json({ error: "Please use unique slug" })
    const newPost = new Post({ title, content, meta, tags, slug, author });
    if (file) {
        const { secure_url: url, public_id } = await cloudinary.uploader.upload(file.path);
        newPost.thumbnail = { url, public_id };
        // return console.log(file);
    }

    await newPost.save();

    if (featured) {
        await addToFeaturedPost(newPost._id);
    }
    res.json({
        post: {
            id: newPost._id,
            title,
            meta,
            slug,
            thumbnail: newPost.thumbnail?.url,
            author: newPost.author,
        },
    });
};
exports.updatePost = async (req, res, next) => {
    const { title, content, meta, tags, slug, author, featured } = req.body;
    const { file } = req;
    const { postId } = req.params;

    if (!isValidObjectId(postId)) {
        return res.status(401).json({ error: "Invalid request!" });
    }
    const post = await Post.findById(postId);
    if (!post) {
        return res.status(404).json({ error: "Post not found!" });
    }
    const { public_id } = post.thumbnail?.public_id;
    if (public_id && file) {
        const { result } = await cloudinary.uploader.destroy(public_id);
        if (result !== "ok") {
            return res.status(404).json({ error: "could not remove thumbnail" });
        }
    }
    if (file) {
        const { secure_url: url, public_id } = await cloudinary.uploader.upload(file.path);
        post.thumbnail = { url, public_id };

    }
    post.title = title;
    post.meta = meta;
    post.content = content;
    post.slug = slug;
    post.author = author;
    post.tags = tags;

    if (featured) {
        await addToFeaturedPost(post._id);
    } else {
        await removeFromFeaturedPost(post._id);
    }

    await post.save();


    res.json({
        post: {
            id: post._id,
            title,
            meta,
            slug,
            tags,
            thumbnail: post.thumbnail?.url,
            author: post.author,
            content,
            featured,
        },
    });
};
exports.deletePost = async (req, res) => {
    const { postId } = req.params;
    if (!isValidObjectId(postId)) {
        return res.status(401).json({ error: "Invalid request!" });
    }
    const post = await Post.findById(postId);
    if (!post) {
        return res.status(404).json({ error: "Post not found!" });
    }
    const { public_id } = post.thumbnail?.public_id;
    if (public_id) {
        const { result } = await cloudinary.uploader.destroy(public_id);
        if (result !== "ok") {
            return res.status(404).json({ error: "could not remove thumbnail" });
        }
    }
    await Post.findByIdAndDelete(postId);
    await removeFromFeaturedPost(postId);
    res.json({ message: "Post removed successfully!" });
}

exports.getPost = async (req, res) => {
    const { slug } = req.params;

    if (!slug) {
        return res.status(401).json({ error: "Invalid request!" });
    }

    const post = await Post.findOne({ slug });

    if (!post) {
        return res.status(404).json({ error: "Post not found!" });
    }
    const featured = await isFeaturedPost(post._id);
    const { title, content, meta, tags, author } = post;
    res.json({
        post: {
            id: post._id,
            title,
            meta,
            slug,
            thumbnail: post.thumbnail?.url,
            author,
            content,
            tags,
            featured,
        },
    });
}
exports.getPosts = async (req, res) => {
    const { pageNo = 0, limit = 0 } = req.query;

    const posts = await Post.find({}).sort({ createdAt: -1 })
        .skip(parseInt(pageNo) * parseInt(limit))
        .limit(parseInt(limit));

    const postCount = await Post.countDocuments();
    res.json({
        posts: posts.map((post) => ({

            id: post._id,
            title: post.title,
            meta: post.meta,
            slug: post.slug,
            thumbnail: post.thumbnail?.url,
            author: post.author,
            content: post.content,
            tags: post.tags,
            createdAt: post.createdAt,
        })),
        postCount,
    });

}
exports.searchPost = async (req, res) => {
    const { title } = req.query;
    if (!title.trim())
        return res.status(401).json({ error: "Search query is missing!" })
    const posts = await Post.find({ title: { $regex: title, $options: "i" } });

    res.json({
        posts: posts.map((post) => ({

            id: post._id,
            title: post.title,
            meta: post.meta,
            slug: post.slug,
            thumbnail: post.thumbnail?.url,
            author: post.author,
            content: post.content,
            tags: post.tags,
            createdAt: post.createdAt,


        }))
    });

}
exports.getFeaturedPosts = async (req, res) => {
    const featuredPosts = await FeaturedPost.find({}).sort({ createdAt: -1 })
        .limit(4)
        .populate("post");

    res.json({
        posts: featuredPosts.map(({ post }) => ({

            id: post._id,
            title: post.title,
            meta: post.meta,
            slug: post.slug,
            thumbnail: post.thumbnail?.url,
            author: post.author,
            content: post.content,
            tags: post.tags,
            featured: post.featured,

        }))
    });

}

exports.getRelatedPosts = async (req, res) => {

    const { postId } = req.params;
    if (!isValidObjectId(postId))
        return res.status(401).json({ error: "Invalid Request!" })
    const post = await Post.findById(postId);
    if (!post)
        return res.status(404).json({ error: "Post not found!" });

    const relatedPosts = await Post.find({
        tags: { $in: [...post.tags] },
        _id: { $ne: post._id },
    }).sort({ createdAt: -1 }).limit(5);



    res.json({
        posts: relatedPosts.map((post) => ({
            id: post._id,
            title: post.title,
            meta: post.meta,
            slug: post.slug,
            thumbnail: post.thumbnail?.url,
            author: post.author,
            content: post.content,
            tags: post.tags,


        }))
    });

}

exports.uploadImage = async (req, res) => {
    const { file } = req;
    if (!file) return res.status(401).json({ error: "Image file is missing!" });

    const { secure_url: url } = await cloudinary.uploader.upload(file.path);
    res.status(201).json({ image: url })
}