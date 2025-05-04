const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const cors = require("cors");

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors()); // Enable CORS for all requests

// Session setup
app.use(session({
    secret: 'your-secret-key', 
    resave: false, 
    saveUninitialized: true,
    cookie: { secure: false }  // Set to true if using HTTPS
}));

// Ensure 'uploads' directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Serve static files (uploads)
app.use('/uploads', express.static(uploadDir));

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Save files in the 'uploads' folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // Unique filename
  }
});
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed.'));
    }
    cb(null, true);
  },
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB file size limit
});

// Connect to MongoDB
mongoose.connect("mongodb://localhost:27017/mentor_connect");
const db = mongoose.connection;
db.on('error', console.error.bind(console, "Error connecting to database"));
db.once('open', () => console.log("Connected to MongoDB"));

// User schema (mentor and mentee)
const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  password: String,
  jobTitle: String,
  company: String,
  location: String,
  category: String,
  scope: String,       // Add this
  department: String,  // Add this
  semester: String,    // Add this
  skills: String,
  bio: String,
  linkedin: String,
  github: String,
  twitter: String,
  phone:{ type: Number, default: null },
  profilePhoto: String,
  age:{ type: Number, default: null },
  gender:String,
  role: { type: String, enum: ['mentor', 'mentee'] },
  requests: [
    {
      menteeName: String,
      menteeEmail: String,
      message: String,
      status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
      timestamp: { type: Date, default: Date.now },
      meetingDetails: {
        date: String,
        time: String,
        meetingLink: String, // Added meetingLink
        notes: String         // Added notes
      },
    },
  ],
  notifications: [
    {
      message: String,
      timestamp: { type: Date, default: Date.now },
    },
  ],

});

const User = mongoose.model("User", userSchema);

// Mentee Sign-Up Route (Updated to use async/await)
app.post("/signup_mentee", upload.single('profilePhoto'), async (req, res) => {
  const { firstName, lastName, email, password, age, scope, department, semester, phone } = req.body;
  console.log("Uploaded File:", req.file); 

  const profilePhoto = req.file ? req.file.filename : null;
  const data = { firstName, lastName, email, password, age, scope, department, semester, phone , profilePhoto, role: "mentee" };

  try {
    // Use await to create the user
    const user = await User.create(data);
    console.log("Mentee signed up successfully");
    res.redirect("/login_mentee.html");
  } catch (err) {
    console.error("Error saving mentee data:", err);
    res.status(500).send("Error saving mentee data");
  }
});

  
// Mentee Login Route
app.post("/login_mentee", async (req, res) => {
    const { email, password } = req.body;
    try {
      const user = await User.findOne({ email, password, role: "mentee" });
      if (!user) {
        return res.status(401).send("Invalid email or password");
      }
      req.session.user = user; // Store the mentee's user data in the session
      res.redirect("/mentee_dashboard");
    } catch (err) {
      console.error("Error:", err);
      res.status(500).send("Internal server error");
    }
  });

  // Serve mentee dashboard HTML file
app.get("/mentee_dashboard", (req, res) => {
    if (!req.session.user || req.session.user.role !== "mentee") {
      return res.redirect("/login_mentee.html"); // Redirect to login if not authenticated
    }
    res.sendFile(path.join(__dirname, "public", "mentee_dashboard.html"));
  });
  




  // API to fetch mentee profile details
  app.get("/api/mentee_profile", async (req, res) => {
    if (!req.session.user || req.session.user.role !== "mentee") {
        return res.status(401).send("Unauthorized");
    }

    try {
        const mentee = await User.findById(req.session.user._id).lean();

        if (!mentee) {
            return res.status(404).send("Mentee not found");
        }

        // Add full profile photo URL
        const profilePhotoUrl = mentee.profilePhoto 
            ? `${req.protocol}://${req.get('host')}/uploads/${mentee.profilePhoto}`
            : null;

        res.json({ ...mentee, profilePhoto: profilePhotoUrl });
    } catch (err) {
        console.error("Error fetching mentee profile:", err);
        res.status(500).send("Internal server error");
    }
});





// Fetch all mentors for mentee to view
app.get("/api/mentors", async (req, res) => {
    try {
        const mentors = await User.find({ role: 'mentor' });
        res.json(mentors);
    } catch (err) {
        console.error("Error fetching mentors:", err);
        res.status(500).send("Internal server error");
    }
});


// Fetch mentors with search functionality
app.get("/api/mentors", async (req, res) => {
  try {
      const { search } = req.query; // Extract search term from query params

      let query = { role: 'mentor' }; // Base query to fetch mentors

      if (search) {
          // Use case-insensitive regex for partial matches
          query.$or = [
              { firstName: { $regex: search, $options: "i" } }, // Match first name
              { lastName: { $regex: search, $options: "i" } },  // Match last name
              { jobTitle: { $regex: search, $options: "i" } },  // Match job title
              { category: { $regex: search, $options: "i" } },  // Match category
              { skills: { $regex: search, $options: "i" } }     // Match skills
          ];
      }

      const mentors = await User.find(query);
      res.json(mentors);
  } catch (err) {
      console.error("Error fetching mentors:", err);
      res.status(500).send("Internal server error");
  }
});











// Send mentor request
app.post("/api/send_request", async (req, res) => {
    if (!req.session.user || req.session.user.role !== "mentee") {
        return res.status(401).send("Unauthorized");
    }

    const { mentorId, message } = req.body;
    const mentee = req.session.user; // Fetch mentee details from session

    try {
        // Add request to the mentor's requests array
        const updateResult = await User.updateOne(
            { _id: mentorId },
            {
                $push: {
                    requests: {
                        menteeName: `${mentee.firstName} ${mentee.lastName}`,
                        menteeEmail: mentee.email,
                        message: message,
                        status: "pending",
                        timestamp: new Date(),
                    },
                },
            }
        );

        if (updateResult.modifiedCount === 0) {
            return res.status(404).send("Mentor not found");
        }

        res.status(200).send("Request sent successfully");
    } catch (err) {
        console.error("Error saving request:", err);
        res.status(500).send("Internal server error");
    }
});

// Fetch mentor requests
app.get("/api/get_requests", async (req, res) => {
  if (!req.session.user || req.session.user.role !== "mentor") {
      return res.status(401).send("Unauthorized");
  }

  try {
      const mentor = await User.findById(req.session.user._id, "requests");
      res.status(200).json(mentor.requests || []);
  } catch (err) {
      console.error("Error fetching requests:", err);
      res.status(500).send("Internal server error");
  }
});

app.post("/api/handle_request", async (req, res) => {
  const { requestId, action } = req.body;

  if (!req.session.user || req.session.user.role !== "mentor") {
    return res.status(401).send("Unauthorized");
  }

  try {
    // Find the request and update its status
    const mentor = await User.findOneAndUpdate(
      { _id: req.session.user._id, "requests._id": requestId },
      { $set: { "requests.$.status": action } },
      { new: true }
    );

    if (!mentor) {
      return res.status(404).send("Request not found");
    }

    // Find the updated request
    const updatedRequest = mentor.requests.find(req => req._id.toString() === requestId);

    if (updatedRequest) {
      // Notify the mentee
      const notificationMessage = `Your request to ${mentor.firstName || "the mentor"} has been ${action}.`;
      const result = await User.updateOne(
        { email: updatedRequest.menteeEmail },
        {
          $push: {
            notifications: {
              message: notificationMessage,
              timestamp: Date.now(),
            },
          },
        }
      );

      // Log for debugging
      console.log('Updated Request:', updatedRequest);
      console.log("Notification added for mentee:", result);
    }

    // Return updated request details, including a placeholder for scheduling
    res.status(200).json({
      message: `Request ${action}ed successfully`,
      updatedRequest,
    });
  } catch (err) {
    console.error("Error handling request:", err);
    res.status(500).send("Internal server error");
  }
});

app.get("/api/notifications", async (req, res) => {
  if (!req.session.user || req.session.user.role !== "mentee") {
    return res.status(401).send("Unauthorized");
  }

  try {
    const mentee = await User.findById(req.session.user._id, "notifications");
    res.json(mentee.notifications || []);
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).send("Internal server error");
  }
});

// Mentor Sign-Up Route (Updated to use async/await)
app.post("/signup_mentor", upload.single('profilePhoto'), async (req, res) => {
  const { firstName, lastName, email, password, jobTitle, company, location, category, skills, bio, linkedin, github, twitter } = req.body;
  const profilePhoto = req.file ? req.file.filename : null;
  const data = {
      firstName, lastName, email, password, jobTitle, company, location, category, skills, bio, linkedin, github, twitter, profilePhoto, role: 'mentor'
  };

  try {
      // Use await to create the user
      const user = await User.create(data);
      console.log("Mentor signed up successfully");
      res.redirect("/login_mentor.html");
  } catch (err) {
      console.error("Error saving mentor data:", err);
      res.status(500).send("Error saving mentor data");
  }
});

// Mentor Login Route
app.post("/login_mentor", async (req, res) => {
    const { email, password } = req.body;
    try {
        // Use async/await instead of a callback
        const user = await User.findOne({ email, password, role: 'mentor' });
        if (!user) {
            return res.status(401).send("Invalid email or password");
        }

        req.session.user = user; // Store the mentor's data in the session
        res.redirect("/mentor_dashboard.html");
    } catch (err) {
        console.error("Error:", err);
        res.status(500).send("Internal server error");
    }
});

// Mentor Dashboard Route
app.get("/mentor_dashboard", (req, res) => {
    if (!req.session.user) {
        return res.redirect("/login_mentor.html"); // Redirect to login if no session
    }
    console.log(req.session.user);  // Debugging step: print session data
    res.json(req.session.user); // Send mentor data as JSON to frontend
});

app.get("/mentor_dashboard_data", (req, res) => {
    if (!req.session.user || req.session.user.role !== 'mentor') {
        return res.status(401).send("Unauthorized");
    }
    res.json(req.session.user); // Send mentor profile data as JSON
});

app.post('/api/schedule_meeting', async (req, res) => {
  const { requestId, date, time, meetingLink, notes } = req.body;

  if (!req.session.user || req.session.user.role !== 'mentor') {
      return res.status(401).send('Unauthorized');
  }

  try {
      const mentor = await User.findOneAndUpdate(
          { _id: req.session.user._id, "requests._id": requestId },
          { 
            $set: { 
                "requests.$.meetingDetails": { 
                    date, 
                    time, 
                    meetingLink, 
                    notes
                } 
            } 
          },
          { new: true }
      );

      if (!mentor) {
          return res.status(404).send('Request not found');
      }

      // Notify the mentee
      const updatedRequest = mentor.requests.find(req => req._id.toString() === requestId);
      if (updatedRequest) {
        const notificationMessage = `
        A meeting has been scheduled with your mentor on ${date} at ${time}.<br>
        You can join the meeting here: <a href="${meetingLink}" </a>.<br>
        Notes: ${notes}
      `;
          await User.updateOne(
              { email: updatedRequest.menteeEmail },
              {
                  $push: {
                      notifications: {
                          message: notificationMessage,
                          timestamp: Date.now(),
                      },
                  },
              }
          );
      }

      res.status(200).json({ message: 'Meeting scheduled successfully', updatedRequest });
  } catch (error) {
      console.error("Error scheduling meeting:", error);
      res.status(500).send('Internal server error');
  }
});

app.get('/api/get_scheduled_meetings', async (req, res) => {
  if (!req.session.user || req.session.user.role !== 'mentor') {
      return res.status(401).send('Unauthorized');
  }

  try {
      const mentor = await User.findById(req.session.user._id);
      if (!mentor) {
          return res.status(404).send('Mentor not found');
      }

      const scheduledMeetings = mentor.requests.filter(request => request.meetingDetails);
      res.status(200).json(scheduledMeetings);
  } catch (error) {
      console.error("Error fetching scheduled meetings:", error);
      res.status(500).send('Internal server error');
  }
});





app.listen(3001, () => console.log("Server listening on port 3001"));  

