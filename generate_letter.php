
<?php
header('Content-Type: application/json');

// Get the POST data
$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    echo json_encode(['success' => false, 'error' => 'No data received']);
    exit;
}

$isPremium = isset($data['isPremium']) ? $data['isPremium'] : false;

// OpenAI API configuration
$openai_api_key = 'YOUR_OPENAI_API_KEY_HERE'; // Replace with your actual API key

// Build the prompt
$prompt = "Generate a professional refund request letter for the following situation:\n\n";
$prompt .= "Customer Name: " . $data['fullName'] . "\n";
$prompt .= "Company: " . $data['companyName'] . "\n";
$prompt .= "Booking Number: " . $data['bookingNumber'] . "\n";
$prompt .= "Date: " . $data['date'] . "\n";
$prompt .= "Issue Type: " . $data['issueType'] . "\n";
$prompt .= "Description: " . $data['description'] . "\n\n";

if ($isPremium) {
    $prompt .= "This is a PREMIUM letter. Include references to relevant US DOT and FTC regulations that support this refund request. ";
    $prompt .= "The tone should be firm but polite, and optimized for maximum chance of approval. ";
    $prompt .= "Structure the letter professionally with clear paragraphs and a formal closing. ";
    $prompt .= "Include specific compensation amounts and legal precedents where applicable.";
} else {
    $prompt .= "This is a FREE letter. Write a concise but effective letter requesting a refund or compensation. ";
    $prompt .= "Use a polite but firm tone and structure it properly. Keep it brief but professional.";
}

$prompt .= "\n\nGenerate only the body content of the letter (no date, addresses, or signature - those will be added separately).";

// Try to use OpenAI API
$letter_content = '';
if ($openai_api_key && $openai_api_key !== 'YOUR_OPENAI_API_KEY_HERE') {
    $letter_content = generateWithOpenAI($prompt, $openai_api_key);
}

// Fallback to template if OpenAI fails or no API key
if (!$letter_content) {
    $letter_content = generateLetterTemplate($data, $isPremium);
}

// Add header and signature
$formattedLetter = "Date: " . date('F j, Y') . "\n\n";
$formattedLetter .= $data['fullName'] . "\n";
$formattedLetter .= $data['email'] . "\n\n";
$formattedLetter .= "To: Customer Service Department\n";
$formattedLetter .= $data['companyName'] . "\n\n";
$formattedLetter .= "Subject: Refund Request for Booking " . $data['bookingNumber'] . "\n\n";
$formattedLetter .= "Dear Customer Service Team,\n\n";
$formattedLetter .= $letter_content . "\n\n";
$formattedLetter .= "Sincerely,\n";
$formattedLetter .= $data['fullName'];

echo json_encode(['success' => true, 'letter' => $formattedLetter]);

function generateWithOpenAI($prompt, $api_key) {
    $url = 'https://api.openai.com/v1/chat/completions';
    
    $data = [
        'model' => 'gpt-4',
        'messages' => [
            [
                'role' => 'system',
                'content' => 'You are a professional legal writer specializing in consumer rights and refund requests.'
            ],
            [
                'role' => 'user',
                'content' => $prompt
            ]
        ],
        'max_tokens' => 1000,
        'temperature' => 0.7
    ];

    $headers = [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $api_key
    ];

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http_code === 200) {
        $result = json_decode($response, true);
        if (isset($result['choices'][0]['message']['content'])) {
            return trim($result['choices'][0]['message']['content']);
        }
    }

    return false;
}

function generateLetterTemplate($data, $isPremium) {
    $issueType = strtolower($data['issueType']);
    
    if ($isPremium) {
        $letter = "I am writing to formally request a full refund for my recent booking (Reference: " . $data['bookingNumber'] . ") due to a " . $data['issueType'] . " that occurred on " . $data['date'] . ".\n\n";
        
        $letter .= "Issue Details:\n" . $data['description'] . "\n\n";
        
        $letter .= "According to the U.S. Department of Transportation (DOT) regulations, specifically 14 CFR Part 250 and 14 CFR Part 259, passengers are entitled to compensation for significant delays and cancellations. Additionally, the Federal Trade Commission (FTC) guidelines on fair business practices support consumer rights to refunds when services are not delivered as promised.\n\n";
        
        $letter .= "I have been a loyal customer and believe this situation warrants immediate attention and full compensation. The inconvenience caused has resulted in additional expenses and significant disruption to my travel plans.\n\n";
        
        $letter .= "I respectfully request:\n";
        $letter .= "1. Full refund of the booking amount\n";
        $letter .= "2. Compensation for additional expenses incurred\n";
        $letter .= "3. Written confirmation of the refund process and timeline\n\n";
        
        $letter .= "I trust that you will handle this matter promptly and in accordance with applicable consumer protection regulations. I look forward to your swift response within 7 business days.";
    } else {
        $letter = "I am writing to request a refund for my booking (Reference: " . $data['bookingNumber'] . ") due to a " . $data['issueType'] . " on " . $data['date'] . ".\n\n";
        
        $letter .= "The issue I experienced was: " . $data['description'] . "\n\n";
        
        $letter .= "This situation caused significant inconvenience and I believe I am entitled to a full refund. I would appreciate your prompt attention to this matter.\n\n";
        
        $letter .= "Please process my refund request and confirm the timeline for completion. I look forward to your response.";
    }
    
    return $letter;
}
?>
