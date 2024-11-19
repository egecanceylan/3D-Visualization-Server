const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use('/potree_output', cors(), express.static('potree_output'));
app.use('/uploads', cors(), express.static('uploads'));
app.use(cors())

// Set up Multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname);
        cb(null, file.originalname.replaceAll(' ', '_'));
    },
});

const upload = multer({ storage });

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded.');
    }

    res.json({ message: 'File uploaded successfully', file: req.file });
});

// Convert endpoint
app.post('/convert', (req, res) => {
    const filename = req.body.filename;
    const filePath = path.join(__dirname, 'uploads', filename);
    const outputDir = path.join(__dirname, 'potree_output', filename.split('.')[0]);

    const command = `./PotreeConverter/build/PotreeConverter ${filePath} -o ${outputDir} --output-attributes RGB`;

    exec(command, (error, stdout, stderr) => {
        if (error) {
            console.error(`Conversion error: ${stderr}`);
            return res.status(500).send(`Error during conversion: ${stderr}`);
        }

        console.log(`Conversion successful: ${stdout}`);

        // Send the URL to the client
        const metadataUrl = `http://localhost:8080/potree_output/${filename.split('.')[0]}/metadata.json`;

        res.json({
            message: 'File uploaded and converted successfully',
            url: metadataUrl // This is the URL that will be returned to the React app
        });
    });
});

app.get('/get-output-files', (req, res) => {
    const directoryPath = path.join(__dirname, 'potree_output');

    fs.readdir(directoryPath, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Unable to scan directory' });
        }
        // Filter directories
        const availableFiles = files.filter((file) => fs.statSync(path.join(directoryPath, file)).isDirectory());
        res.json({ files: availableFiles });
    });
});

// Start the server
app.listen(8080, () => {
    console.log('Server running on http://localhost:8080');
});
