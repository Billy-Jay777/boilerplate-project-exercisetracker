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

// Route to Serve the Index Page
app.get("/", (req, res) => {
	res.sendFile(__dirname + "/views/index.html");
});

// 2. POST /api/users to create a new user
app.post("/api/users", (req, res) => {
	const { username } = req.body;
	const newUser = new User({ username });

	newUser
		.save()
		.then((user) => res.json({ username: user.username, _id: user._id }))
		.catch((err) => res.json({ error: "Username already taken" }));
});

// 4. GET /api/users to get a list of all users
// app.get("/api/users", async (req, res) => {
// 	try {
// 		const users = await User.find({}, "username _id"); // Fetch users with only _id and username
// 		res.json(users);
// 	} catch (err) {
// 		console.error("Database Query Error:", err); // Logs detailed error
// 		res.status(500).json({ error: "Internal Server Error" });
// 	}
// });

app.get("/api/users", async (req, res) => {
	try {
		const users = await User.find({}, "username _id").lean(); // Convert Mongoose objects to plain JSON
		if (!Array.isArray(users)) {
			throw new Error("Database did not return an array.");
		}

		// Ensure _id is a string
		const formattedUsers = users.map((user) => ({
			username: user.username,
			_id: user._id.toString(), // Convert _id from ObjectId to string
		}));

		res.json(formattedUsers);
	} catch (err) {
		console.error("Database Query Error:", err.message); // Logs detailed error
		res.status(500).json({ error: "Internal Server Error" });
	}
});

// 7. POST /api/users/:_id/exercises to add an exercise to a user
app.post("/api/users/:_id/exercises", (req, res) => {
	const { _id } = req.params;
	const { description, duration, date } = req.body;

	const exercise = new Exercise({
		userId: _id,
		description,
		duration: Number(duration),
		date: date ? new Date(date) : new Date(), // If no date, use the current date
	});

	exercise
		.save()
		.then((exercise) => {
			User.findById(_id).then((user) => {
				res.json({
					username: user.username,
					_id: user._id,
					description: exercise.description,
					duration: exercise.duration,
					date: exercise.date.toDateString(),
				});
			});
		})
		.catch((err) => res.json({ error: "Invalid user ID" }));
});

// 9. GET /api/users/:_id/logs to retrieve the exercise log of a user
app.get("/api/users/:_id/logs", (req, res) => {
	const { _id } = req.params;
	const { from, to, limit } = req.query;

	let query = { userId: _id };

	if (from) query.date = { $gte: new Date(from) };
	if (to) query.date = { ...query.date, $lte: new Date(to) };

	Exercise.find(query)
		.limit(Number(limit) || 100) // Default to 100 if no limit is specified
		.then((exercises) => {
			User.findById(_id).then((user) => {
				res.json({
					_id: user._id,
					username: user.username,
					count: exercises.length,
					log: exercises.map((ex) => ({
						description: ex.description,
						duration: ex.duration,
						date: ex.date.toDateString(), // Convert date to string
					})),
				});
			});
		})
		.catch((err) =>
			res.json({ error: "Invalid user ID or exercises not found" })
		);
});

// Start the server
const listener = app.listen(process.env.PORT || 3000, () => {
	console.log("Your app is listening on port " + listener.address().port);
});
