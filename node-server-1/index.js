
require('dotenv').config();

const mongoose = require("mongoose")

const express = require("express");
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const cors = require("cors")
const User = require("./models/User.models")
const Event = require("./models/Event.models")
const Photo = require("./models/Photo.models")
const Studio = require("./models/Studio.models")
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const path = require('path');
const crypto = require('crypto');
require("./Config_db")





const app = express();

app.use(express.json());
app.use(cors())

//----------------------------------------------------------------------------
function generateOTP() {
    return crypto.randomInt(100000, 999999).toString(); // 6-digit OTP
}

let otpStorage = {}; // In-memory store to map email -> OTP

//-----------------------------------------------------------------------------

const JWT_SECRET = process.env.JWT_SECRET;
const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Use your Gmail app password here
    },
});


//------------------------------------------------------------------------------
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Ensure this directory exists
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // Unique filename
    },
});
const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB size limit
    fileFilter: (req, file, cb) => {
        // Allow only image files
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    },
});
const storage2 = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'event_profile/'); // Ensure this directory exists
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // Unique filename
    },
});
const event_profile_up = multer({
    storage: storage2,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB size limit
    fileFilter: (req, file, cb) => {
        // Allow only image files
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/tiff'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    },
});

app.use('/uploads', express.static('uploads'));
app.use('/event_profile', express.static('event_profile'));
//---------------------------------------------------------------------------------

app.post("/register", async (req, resp) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return resp.status(400).send({ message: "All details are required" });
        }

        const user = new User({ name, email, password, isVerified: true });
        const result = await user.save();

        // Generate a JWT token for verification
        const token = jwt.sign({ userId: result._id }, JWT_SECRET, { expiresIn: '1h' });

        // Send verification email (skip if dummy)
        const verificationLink = `http://localhost:5000/verify/${token}`;
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_USER,
                to: email,
                subject: 'Verification',
                html: `<p>Hello ${name},</p><p>Please verify your email by clicking the link below:</p><br/><a href="${verificationLink}">Verify Email</a>`,
            });
        } catch(e){ console.log('Email skipped (local dev):', e.message)}
        resp.send({ message: "Registration successful! Please verify your email." });
    } catch (error) {
        if (error.code === 11000 && error.keyPattern.email) {
            resp.status(400).send({ message: 'Email already exists' });
        } else {
            resp.status(500).send({ message: 'An unexpected error occurred' });
        }
    }
});

//---------------------------------------------------------------------------------------------------------------------

app.get('/verify/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const decoded = jwt.verify(token, JWT_SECRET);

        // Mark the user as verified
        const user = await User.findByIdAndUpdate(decoded.userId, { isVerified: true }, { new: true });

        if (user) {
            res.redirect('http://localhost:3000/confirmed?status=success');
        } else {
            res.redirect('http://localhost:3000/confirmed?status=failed');
        }
    } catch (error) {
        res.redirect('http://localhost:3000/confirmed?status=failed');
    }
});
//-----------------------------------------------------------------------------------------------------------------

// Example: Backend endpoint to check email verification status
app.post("/check-verification", async (req, res) => {
    const { email, password } = req.body;
    let user = await User.findOne({ email, password });

    if (!user) {
        return res.status(404).send({ message: 'User not found' });
    }

    // Assuming the user model has an `isVerified` field
    if (user.isVerified) {
        const { name, _id } = user
        user = { name, _id }
        return res.send(user);
    }

    res.send({ message: "Not verified!!!", verified: false });
});


//-----------------------------------------------------------------------------------------------------------------


app.post('/resend-verification', async (req, resp) => {
    try {
        const { email } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return resp.status(404).send({ message: 'User not found.' });
        }

        if (user.isVerified) {
            return resp.status(400).send({ message: 'User is already verified.' });
        }

        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });

        const verificationLink = `http://localhost:3000/verify/${token}?email=${email}`;
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Resend: Verify your Email',
            html: `<p>Hello ${user.name},</p>
                   <p>Please verify your email by clicking the link below:</p>
                   <a href="${verificationLink}">Verify Email</a>`,
        });

        resp.send({ message: 'Verification email has been resent.' });
    } catch (error) {
        console.error(error);
        resp.status(500).send({ message: 'Failed to resend the verification email.' });
    }
});




//-------------------------------------------------------------------------------------------------------------------

app.post("/login", async (req, resp) => {
    if (req.body.email && req.body.password) {
        const user = await User.findOne(req.body).select("name")
        if (user) {
            resp.status(200).send(user)
        } else {
            resp.status(404).send({ message: 'Invalid email or password' })
        }
    } else {
        resp.status(400).send({ message: "Email and password are required" })
    }
})

//--------------------------------------------------------------------------------------------------------------------

app.post("/event", event_profile_up.single('event_photo'), async (req, resp) => {
    if (req.body.event_name && req.body.created_id) {
        try {
            const userCheck = await User.findById(req.body.created_id);
            if (userCheck) {
                // Create the event with data from the request body
                const event = new Event({
                    event_name: req.body.event_name,
                    pin: req.body.pin,
                    created_id: req.body.created_id,
                    event_photo: req.file ? req.file.filename : null  // Save the image path if file is uploaded
                });

                let result = await event.save();
                if (result) {
                    const { event_name, _id, event_photo } = result;
                    result = { event_name, _id, event_photo };  // Include the image URL in the response
                    resp.status(200).send(result);
                } else {
                    resp.status(500).send({ result: "Failed to create event" });
                }
            } else {
                resp.status(404).send({ result: "User account is not valid or not available" });
            }
        } catch (error) {
            resp.status(500).send({ result: "An error occurred", error: error.message });
        }
    } else {
        resp.status(400).send({ result: "Event name and created_id are required" });
    }
});


//-------------------------------------------------------------------------------------------------------------------

app.post("/display_event", async (req, resp) => {
    try {

        const { userId } = req.body;

        if (userId) {
            // Assuming that the events are associated with the user via `created_id`
            const events = await Event.find({ created_id: userId });

            if (events && events.length > 0) {
                resp.status(200).send(events);
            } else {
                resp.status(404).send({ message: "Please create your events" });
            }
        } else {
            resp.status(400).send({ message: "User ID is required" });
        }
    } catch (error) {
        console.error("Error retrieving events:", error);
        resp.status(500).send({ message: "An error occurred while retrieving events" });
    }
});
//---------------------------------------------------------------------------------------------------------
app.post('/in-event', async (req, resp) => {
    const { _id } = req.body;

    if (!_id) {
        return resp.status(400).send({ result: "Event ID is required" });
    }

    try {
        const result = await Photo.find({ event_id: _id });

        if (result.length > 0) {
            resp.status(200).send(result);
        } else {
            resp.status(404).send({ result: "Images Not Found!" });
        }
    } catch (error) {
        resp.status(500).send({ result: "An error occurred while retrieving images", error: error.message });
    }
});



//---------------------------------------------------------------------------------------------------------

app.post('/photo', upload.array('name', 10), async (req, res) => {
    try {
        const files = req.files;
        const { event_id, upload_by } = req.body; // Assuming these are passed in the request body

        const photos = await Promise.all(
            files.map(async (file) => {
                // Send the image to the Flask server to get the embedding
                const formData = new FormData();
                formData.append('image', fs.createReadStream(file.path)); // Use fs.createReadStream

                const response = await axios.post('http://127.0.0.1:5001/get_embedding', formData, {
                    headers: {
                        ...formData.getHeaders(),
                    },

                });

                if (response.data.error) {
                    throw new Error(response.data.error);
                }

                // Check if there is an error in the response
                if (response.data.error) {
                    // Delete the file if the embedding is not generated
                    fs.unlinkSync(file.path); // Remove the file after processing

                    throw new Error('Embedding is not generated: ' + response.data.error);
                }

                const embedding = response.data.embedding;

                // Save image and embedding to MongoDB using the Photo schema
                const photo = new Photo({
                    name: file.filename,
                    event_id: event_id,
                    upload_by: upload_by,
                    embedding: JSON.stringify(embedding), // Convert the embedding array to a string for storage
                });


                await photo.save(); // Save each photo

                // Optionally delete the file after processing if you don't need it anymore
                //   fs.unlinkSync(file.path); // Remove the file after processing

                return photo; // Return saved photo
            })
        );

        // Send a response back to the client
        res.status(200).send(photos);
    } catch (error) {
        console.error(error);
        res.status(500).json({ result: 'An error occurred while uploading images', error: error.message });
    }
});

//---------------------------------------------------------------------------------------------------

app.delete('/delete-event', async (req, res) => {
    try {
        const { _id } = req.body;

        if (!_id) {
            return res.status(400).send({ message: "Event is Missing! Please Reload" });
        }

        // Delete event by ID
        const event = await Event.findByIdAndDelete(new mongoose.Types.ObjectId(_id));

        if (!event) {
            return res.status(404).send({ message: "Event not found! Reload the page." });
        }

        
        if(event.event_photo){
            const coverImage_path = path.join(__dirname,'event_profile',event.event_photo)
            fs.unlink(coverImage_path,(err)=>{
                if(err){
                    console.error(`failed to deleted cover image ${coverImage_path}`)
                }else{
                    console.log(`Deleted cover image ${coverImage_path}`)
                }
            })
        }

        // Find and delete all photos linked to the event
        const photos = await Photo.find({ event_id: _id });
        await Photo.deleteMany({ event_id: _id });

        // Delete photo files from the "uploads" folder
        photos.forEach((photo) => {
            const photoPath = path.join(__dirname, 'uploads', photo.name);
            fs.unlink(photoPath, (err) => {
                if (err) {
                    console.error(`Failed to delete file: ${photoPath}`, err);
                } else {
                    console.log(`Deleted file: ${photoPath}`);
                }
            });
        });

        return res.status(200).send(event);

    } catch (error) {
        console.error("Error deleting event:", error);
        res.status(500).json({ success: false, message: "Error deleting Event!" });
    }
});


//-----------------------------------------------------------------------------------------------------
app.delete('/delete-image', async (req, res) => {
    try {
        const { name, _id } = req.body;

        if (!name || !_id) {
            return res.status(400).json({ success: false, message: "Missing images detail's" });
        }


        const result = await Photo.findOneAndDelete({ name, _id: new mongoose.Types.ObjectId(_id) });



        if (!result) {
            return res.status(404).json({ success: false, message: "Image not found in database" });
        }

        // Delete the image file from the server
        const imagePath = path.join(__dirname, 'uploads', name);
        fs.unlink(imagePath, (err) => {
            if (err) {
                return res.status(500).json({ success: false, message: "Failed to delete image file" });
            }

            return res.json({ success: true, message: "Image deleted successfully" });
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deleting image!" });
    }
});


//-----------------------------------------------------------------------------------------------------
app.post("/collect_event", async (req, resp) => {
    try {
        if (!req.body._id || req.body._id.length !== 24) {
            return resp.status(400).send({ message: "Event link is not Correct" });
        }
        
        const { _id } = req.body;
        const objectId = new mongoose.Types.ObjectId(_id);

        // Find the event by its ID
        let event = await Event.findById(objectId);

        if (event) {
            let studio = await Studio.findOne({ create_by: event.created_id });

            event.pin = 1; // Update the pin field
            

            if (studio) {
                resp.status(200).send({ event, studio });
            } else {
                resp.status(200).send({ event });
            }
        } else {
            resp.status(404).send({ message: "Event not found or deleted!" });
        }
    } catch (error) {
        console.error("Error retrieving events:", error);
        resp.status(500).send({ message: "An error occurred while retrieving events" });
    }
});
//-------------------------------------------------------------------------------------------------------

app.post("/confirm_pin", async (req, resp) => {
    try {
        const { _id, pin } = req.body;
        if (_id) {
            // Convert _id to ObjectId if necessary
            const objectId = new mongoose.Types.ObjectId(_id);

            // Query the database to find the event by _id
            let event = await Event.findById(objectId).select("pin");

            if (event) {
                if (event.pin == pin) {
                    resp.status(200).send({ result: "Pin confirmed", pin: event.pin });
                } else {
                    resp.status(404).send({ result: "Pin is wrong! Contact the photographer to provide the correct (Pin)" });
                }
            } else {
                resp.status(404).send({ result: "Event not found. Please check the Event ID." });
            }
        } else {
            resp.status(400).send({ result: "Event ID is required." });
        }
    } catch (error) {
        console.error("Server Error:", error);
        // Send a more specific error response to the client
        resp.status(500).send({
            result: "An error occurred on the server!",
            error: error.message // Include the actual error message (for debugging)
        });
    }
});

//-------------------------------------------------------------------------------------------------------

app.post('/studio', async (req, resp) => {
    const { studio_name, phone_no, address, offer, description, create_by } = req.body;

    if (create_by && studio_name && phone_no) {
        try {
            // Check if the record exists
            const existingStudio = await Studio.findOne({create_by:create_by});

            if (existingStudio) {
                // Update existing record
                const updatedStudio = await Studio.findOneAndUpdate(
                    {create_by:create_by},
                    { studio_name, phone_no,address,offer,description },
                    { new: true } // Return the updated document
                );

                if (updatedStudio) {
                    return resp.status(200).send({ message: "Updated your details!", updatedStudio });
                } else {
                    return resp.status(404).send({ message: 'Failed to update your details!' });
                }
            } else {
                // Create a new record
                const studio = new Studio(req.body);
                const result = await studio.save();

                if (result) {
                    return resp.status(200).send({ message: "Saved your details!", studio: result });
                } else {
                    return resp.status(404).send({ message: 'Failed to save your details!' });
                }
            }
        } catch (error) {
            if (error.code === 11000 && error.keyPattern?.create_by) {
                resp.status(400).send({ message: 'Studio detail already exists' });
            } else {
                
                resp.status(500).send({ message: 'An unexpected error occurred' });
            }
        }
    } else {
        return resp.status(400).send({ message: "Studio name, Phone No, and Created By are required" });
    }
});

//-----------------------------------------------------------------------------------------------------
app.get('/exist-studio', async (req, res) => {
    try {
        const { create_by } = req.query; // Use query for GET request parameters

        if (create_by) {
            const exist = await Studio.findOne({ create_by });

            if (exist) {
                return res.status(200).send({ message: 'Detail is available', exist });
            } else {
                return res.status(404).send({ message: "Detail not present", });
            }
        } else {
            return res.status(400).send({ message: "create_by parameter is required" });
        }
    } catch (error) {
        console.error(error);
        return res.status(500).send({ message: 'An unexpected error occurred' });
    }
});


//-------------------------------------------------------------------------------------------------------

// Send OTP route
app.post('/send-otp', async (req, res) => {
    const { email } = req.body;
    // delete otpStorage[email];

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    } else {
        let check = await User.findOne({ email: email })
        if (check) {
            try {
                const otp = generateOTP();
                otpStorage[email] = otp; // Store OTP against email
        
                const mailOptions = {
                    from: process.env.EMAIL_USER,
                    to: email,
                    subject: 'Your OTP Code',
                    text: `Your OTP code is ${otp}. It will expire in 5 minutes.`,
                };
        
                await transporter.sendMail(mailOptions);
                res.status(200).json({ message: `OTP sent ${email} successfully!` });
            } catch (error) {
                console.error('Error sending email:', error);
                res.status(500).json({ message: 'Failed to send OTP' });
            }
            
        } else{
            return res.status(404).send({ message: `${email} is not Register!` })

        }
    }


   
});


//-------------------------------------------------------------------------------------------------------

// Verify OTP route
app.post('/newPassword-verify-otp', async (req, res) => {
    const { email, otp, newpassword } = req.body;
    if (!email || !otp || !newpassword) {
        return res.status(400).send({ message: 'All Inputs are required!!!' })
    }

    if (otpStorage[email] === otp) {
        delete otpStorage[email]; // Remove OTP after verification
        let update = await User.updateOne(
            { email: email },
            { $set: { password: newpassword } })
        if(update){
        res.status(200).json({ message: 'Your Password is successfully Change!' });
        }else{
            res.status(404).send({message:"User is not available or Server error"})
        }

    } else {
        res.status(400).json({ message: `Invalid OTP or Expire! Regenrate OTP against ${email}` });
    }
});


//----------------------------------------------------------------------------------------------------

app.put("/events/:id", async (req, res) => {
    const { id } = req.params; // Extract event ID from URL params
    const { updateName, updatePin } = req.body; // Extract fields to update from request body
    const event_name = updateName
    const pin = updatePin
    try {
        // Validate inputs
        if (!event_name && !pin) {
            return res.status(400).json({ message: "Not Provide event_name or pin to update." });
        }

        // Update the event
        const updatedEvent = await Event.findByIdAndUpdate(
            id,
            { $set: { event_name, pin } },
            { new: true, runValidators: true } // Return the updated document and run schema validators
        );

        if (!updatedEvent) {
            return res.status(404).json({ message: "Event not found." });
        }

        // Success response
        res.status(200).json({ message: "Event updated successfully.", updatedEvent });
    } catch (error) {
        console.error("Error updating event:", error);
        res.status(500).json({ message: "Internal server error.", error: error.message });
    }
});


//-------------------------------------------------------------------------------------------------------




app.listen(5000)
console.log("server is running on port 5000")
// app.listen(5000, () => {
//     console.log("Server is running on port 5000");
// });
