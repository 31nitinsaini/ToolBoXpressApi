// server.js
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const app = express();
const PORT = 5000;
const connectToMongoDB = async () => {
  try {
    await mongoose.connect('mongodb+srv://toolboxpress:toolboxpress123@toolboxpress.vv4dspn.mongodb.net/', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
  }
};
app.get('/', (req, res) => {
  res.send('Hey this is my API running 🥳')
})

// Call the function to connect to MongoDB
connectToMongoDB();
// Allow requests from a specific origin
app.use(cors({ origin: 'https://toolboxpress.vercel.app' }));app.use(express.json())
app.use(bodyParser.json());

const feedbackSchema = new mongoose.Schema({
  rating: Number,
  feedback: String,
  url: String,
});

const Feedback = mongoose.model('Feedback', feedbackSchema);

app.post('/submit-feedback', async (req, res) => {
  try {
    const { rating, feedback, url } = req.body;
    const newFeedback = new Feedback({ rating, feedback, url });
    await newFeedback.save();
    res.status(201).send('Feedback submitted successfully!');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});
app.get('/get-average-rating', async (req, res) => {
  try {
    const url = req.query.currentUrl;

    // Get average rating and count for the given URL
    const result = await Feedback.aggregate([
      { $match: { url } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0, // Exclude _id field from the result
          averageRating: { $round: ['$averageRating', 1] }, // Round to 1 decimal place
          count: 1,
        },
      },
    ]);

    const averageRating = result.length > 0 ? result[0].averageRating : 0;
    const count = result.length > 0 ? result[0].count : 0;

    res.status(200).json({ averageRating, count });
  } catch (error) {
    console.error('Error getting average rating:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.get('/popular-tools', async (req, res) => {
  try {
    const popularTools = await Feedback.aggregate([
      {
        $group: {
          _id: '$url',
          averageRating: { $avg: '$rating' },
          feedbacks: { $push: { rating: '$rating', feedback: '$feedback' } },
        },
      },
      {
        $sort: { averageRating: -1 },
      },
      {
        $limit: 3,
      },
      {
        $project: {
          _id: 0, // Exclude _id field from the result
          url: '$_id',
          rating: { $round: ['$averageRating', 1] }, // Round to 1 decimal place
        },
      },
    ]);

    res.status(200).json(popularTools);
  } catch (error) {
    console.error('Error getting popular tools:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const visitorSchema = new mongoose.Schema({
  ipAddress: String,
});

const Visitor = mongoose.model('Visitor', visitorSchema);

// Middleware to track unique visitors
app.use(async (req, res, next) => {
  const ipAddress = getClientIp(req);
  const existingVisitor = await Visitor.findOne({ ipAddress });

  if (!existingVisitor) {
    await new Visitor({ ipAddress }).save();
  }

  next();
});

// Function to get client's IP address considering proxies
function getClientIp(req) {
  const forwardedHeader = req.headers['x-forwarded-for'];
  if (forwardedHeader) {
    const ipList = forwardedHeader.split(',');
    console.log(ipList[0]);
    return ipList[0].trim();
  }

  return req.connection.remoteAddress;
}

// Middleware to handle preflight requests
app.options('/visitor-count');
// Route to get the count of unique visitors
app.get('/visitor-count', async (req, res) => {
  try {
    const count = await Visitor.countDocuments();
    res.status(200).json({ count });
  } catch (error) {
    console.error('Error getting visitor count:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Create a mongoose schema
const websiteFeedbackSchema = new mongoose.Schema({
  overall: Number,
  userInterface: Number,
  toolVariety: Number,
  easeOfUse: Number,
  timestamp: { type: Date, default: Date.now },
});

// Create a mongoose model
const WebsiteFeedback = mongoose.model('WebsiteFeedback', websiteFeedbackSchema);
// Middleware to handle preflight requests
app.options('/website-feedback');
// API endpoint to store feedback
app.post('/website-feedback', async (req, res) => {
  try {
    const { overall, userInterface, toolVariety, easeOfUse } = req.body;
    console.log(req.body)
    // Create a new feedback instance
    const newWebsiteFeedback = new WebsiteFeedback({
      overall,
      userInterface,
      toolVariety,
      easeOfUse,
    });

    // Save the feedback to MongoDB
    await newWebsiteFeedback.save();

    res.status(201).json({ message: 'Feedback submitted successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
// ... (existing code)

const subscriptionSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);

// Middleware to handle preflight requests
app.options('/subscribe');

// API endpoint to store email subscriptions
app.post('/subscribe', async (req, res) => {
  try {
    const { email } = req.body;

    // Check if the email already exists
    const existingSubscription = await Subscription.findOne({ email });
    if (existingSubscription) {
      return res.json({ error: 'Email already subscribed!' });
    }

    // Create a new subscription instance
    const newSubscription = new Subscription({ email });

    // Save the subscription to MongoDB
    await newSubscription.save();

    res.status(201).json({ message: 'Subscription successful!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

//request tool
const toolRequestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  toolName: { type: String, required: true },
  toolDescription: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});
const ToolRequest = mongoose.model('ToolRequest', toolRequestSchema);

// Middleware to handle preflight requests
app.options('/request-tool');

// API endpoint to handle tool requests
app.post('/request-tool', async (req, res) => {
  try {
    const { name, email, toolName, toolDescription } = req.body;

    // Create a new tool request instance
    const newToolRequest = new ToolRequest({
      name,
      email,
      toolName,
      toolDescription,
    });

    // Save the tool request to MongoDB
    await newToolRequest.save();

    res.status(201).json({ message: 'Tool request submitted successfully!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
