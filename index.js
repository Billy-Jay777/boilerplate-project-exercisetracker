const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

// Middleware
app.use(cors());
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true })); // For parsing form data

// MongoDB setup and connection
mongoose
	.connect(
		"mongodb+srv://amungabill:qfuRSJJtKuqsyrZH@cluster0.u2lpj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0",
		{
			useNewUrlParser: true,
			useUnifiedTopology: true,
		}
	)
	.then(() => console.log("Connected to MongoDB"))
	.catch((err) => console.log("MongoDB connection error:", err));

// User Schema
const userSchema = new mongoose.Schema({
	username: { type: String, required: true, unique: true },
});
const User = mongoose.model("User", userSchema);

// Exercise Schema
const exerciseSchema = new mongoose.Schema({
	userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
	description: { type: String, required: true },
	duration: { type: Number, required: true },
	date: { type: Date, default: Date.now },
});
const Exercise = mongoose.model("Exercise", exerciseSchema);

// Serve the Index Page
app.get("/", (req, res) => {
	res.sendFile(__dirname + "/views/index.html");
});

// 1️⃣ POST /api/users → Create a new user
app.post("/api/users", async (req, res) => {
	try {
		const { username } = req.body;
		const newUser = new User({ username });
		const savedUser = await newUser.save();
		res.json({ username: savedUser.username, _id: savedUser._id });
	} catch (err) {
		res.status(400).json({ error: "Username already taken" });
	}
});

// 2️⃣ GET /api/users → Retrieve all users
app.get("/api/users", async (req, res) => {
	try {
		const users = await User.find({}, "username _id").lean();
		res.json(users);
	} catch (err) {
		console.error("Error fetching users:", err);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

// 3️⃣ POST /api/users/:_id/exercises → Add an exercise
app.post("/api/users/:_id/exercises", async (req, res) => {
	try {
		const { _id } = req.params;
		const { description, duration, date } = req.body;

		const user = await User.findById(_id);
		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}

		const exercise = new Exercise({
			userId: _id,
			description,
			duration: Number(duration),
			date: date ? new Date(date) : new Date(),
		});

		const savedExercise = await exercise.save();

		res.json({
			username: user.username,
			description: savedExercise.description,
			duration: savedExercise.duration,
			date: savedExercise.date.toDateString(),
			_id: user._id,
		});
	} catch (err) {
		console.error("Error adding exercise:", err);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

// 4️⃣ GET /api/users/:_id/logs → Get exercise logs
app.get("/api/users/:_id/logs", async (req, res) => {
	try {
		const { _id } = req.params;
		const { from, to, limit } = req.query;

		const user = await User.findById(_id);
		if (!user) {
			return res.status(404).json({ error: "User not found" });
		}

		let query = { userId: _id };
		if (from) query.date = { $gte: new Date(from) };
		if (to) query.date = { ...query.date, $lte: new Date(to) };

		const exercises = await Exercise.find(query)
			.limit(Number(limit) || 100)
			.lean();

		res.json({
			username: user.username,
			_id: user._id,
			count: exercises.length,
			log: exercises.map((ex) => ({
				description: ex.description,
				duration: ex.duration,
				date: ex.date.toDateString(),
			})),
		});
	} catch (err) {
		console.error("Error fetching logs:", err);
		res.status(500).json({ error: "Internal Server Error" });
	}
});

// Start the server
const listener = app.listen(process.env.PORT || 3000, () => {
	console.log("Your app is listening on port " + listener.address().port);
});
