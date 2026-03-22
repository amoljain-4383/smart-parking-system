// Importing necessary libraries
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

// Initializing Express app
const app = express();
app.use(express.json());

// Supabase client initialization
const supabaseUrl = 'https://YOUR_SUPABASE_URL';  // Replace with your Supabase URL
const supabaseKey = 'YOUR_SUPABASE_KEY';  // Replace with your Supabase API key
const supabase = createClient(supabaseUrl, supabaseKey);

// Sample route to fetch data from Supabase
app.get('/data', async (req, res) => {
    const { data, error } = await supabase
        .from('YOUR_TABLE_NAME')  // Replace with your actual table name
        .select('*');

    if (error) return res.status(500).send(error);
    res.status(200).json(data);
});

// Sample route to insert data into Supabase
app.post('/data', async (req, res) => {
    const { name, value } = req.body;
    const { data, error } = await supabase
        .from('YOUR_TABLE_NAME')  // Replace with your actual table name
        .insert([{ name, value }]);

    if (error) return res.status(500).send(error);
    res.status(201).json(data);
});

// Starting the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});