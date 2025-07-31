<?php
header('Content-Type: application/json');

// Get the POST data
$data = json_decode(file_get_contents('php://input'), true);

// Validate required fields
$requiredFields = ['fullName', 'email', 'companyName', 'bookingNumber', 'date', 'issueType', 'description'];
foreach ($requiredFields as $field) {
    if (empty($data[$field])) {
        echo json_encode(['success' => false, 'error' => "Field $field is required"]);
        exit;
    }
}

// Prepare the prompt for OpenAI
$isPremium = isset($data['isPremium']) && $data['isPremium'];
$prompt = "Write a professional refund request letter for a " . $data['issueType'] . " issue with " . $data['companyName'] . ".\n\n";
$prompt .= "Details:\n";
$prompt .= "Customer Name: " . $data['fullName'] . "\n";
$prompt .= "Booking/Ticket Number: " . $data['bookingNumber'] . "\n";
$prompt .= "Date of Travel/Stay: " . $data['date'] . "\n";
$prompt .= "Issue Description: " . $data['description'] . "\n\n";

if ($isPremium) {
    $prompt .= "Include references to relevant US DOT and FTC regulations that support this refund request. ";
    $prompt .= "The tone should be firm but polite, and optimized for maximum chance of approval. ";
    $prompt .= "Structure the letter professionally with clear paragraphs and a formal closing.";
} else {
    $prompt .= "Write a concise but effective letter requesting a refund or compensation. ";
    $prompt .= "Use a polite but firm tone and structure it properly.";
}

// Call OpenAI API
$openai_api_key = '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';
$url = 'https://api.openai.com/v1/chat/completions';

$headers = [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $openai_api_key
];

$postData = [
    'model' => 'gpt-4.1-mini',
    'messages' => [
        [
            'role' => 'system',
            'content' => 'You are a helpful assistant that generates professional refund request letters for airline and hotel issues.'
        ],
        [
            'role' => 'user',
            'content' => $prompt
        ]
    ],
    'temperature' => 0.7,
    'max_tokens' => 1000
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($postData));
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
curl_close($ch);

$responseData = json_decode($response, true);

if (isset($responseData['choices'][0]['message']['content'])) {
    $letter = $responseData['choices'][0]['message']['content'];
    
    // Format the letter with proper line breaks
    $letter = str_replace("\n", "\n\n", $letter);
    
    // Add header and signature
    $formattedLetter = "Date: " . date('Y-m-d') . "\n\n";
    $formattedLetter .= $data['fullName'] . "\n";
    $formattedLetter .= $data['email'] . "\n\n";
    $formattedLetter .= "To: Customer Service\n";
    $formattedLetter .= $data['companyName'] . "\n\n";
    $formattedLetter .= "Subject: Refund Request for Booking " . $data['bookingNumber'] . "\n\n";
    $formattedLetter .= "Dear Customer Service Team,\n\n";
    $formattedLetter .= $letter . "\n\n";
    $formattedLetter .= "Sincerely,\n";
    $formattedLetter .= $data['fullName'] . "\n";
    
    echo json_encode(['success' => true, 'letter' => $formattedLetter]);
} else {
    echo json_encode(['success' => false, 'error' => 'Failed to generate letter']);
}
?>