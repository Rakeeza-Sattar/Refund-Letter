
<?php
require_once 'vendor/autoload.php';

header('Content-Type: application/json');

// Get the POST data
$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['email']) || !isset($data['letter']) || !isset($data['fullName'])) {
    echo json_encode(['success' => false, 'error' => 'Missing required data']);
    exit;
}

try {
    // Generate PDF (using TCPDF or similar library)
    $pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, PDF_PAGE_FORMAT, true, 'UTF-8', false);
    
    // Set document information
    $pdf->SetCreator('Refund Letter Generator');
    $pdf->SetAuthor($data['fullName']);
    $pdf->SetTitle('Refund Request Letter');
    
    // Add a page
    $pdf->AddPage();
    
    // Set font
    $pdf->SetFont('helvetica', '', 12);
    
    // Add content
    $pdf->writeHTML('<h2>Refund Request Letter</h2>', true, false, true, false, '');
    $pdf->writeHTML('<pre>' . htmlspecialchars($data['letter']) . '</pre>', true, false, true, false, '');
    
    // Save PDF to temporary file
    $pdfContent = $pdf->Output('', 'S');
    $pdfFileName = 'refund_letter_' . date('Y-m-d') . '.pdf';
    
    // Send email with PDF attachment
    $to = $data['email'];
    $subject = 'Your Premium Refund Request Letter';
    $message = "Dear " . $data['fullName'] . ",\n\n";
    $message .= "Thank you for using our Premium Refund Letter Generator. ";
    $message .= "Please find your professionally crafted refund request letter attached as a PDF.\n\n";
    $message .= "This letter includes legal references and has been optimized for maximum approval chances.\n\n";
    $message .= "Best regards,\nRefund Letter Generator Team";
    
    // Email headers
    $boundary = md5(uniqid(time()));
    $headers = "From: noreply@refundletters.com\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: multipart/mixed; boundary=\"$boundary\"\r\n";
    
    // Email body
    $emailBody = "--$boundary\r\n";
    $emailBody .= "Content-Type: text/plain; charset=UTF-8\r\n";
    $emailBody .= "Content-Transfer-Encoding: 7bit\r\n\r\n";
    $emailBody .= $message . "\r\n\r\n";
    
    // PDF attachment
    $emailBody .= "--$boundary\r\n";
    $emailBody .= "Content-Type: application/pdf; name=\"$pdfFileName\"\r\n";
    $emailBody .= "Content-Transfer-Encoding: base64\r\n";
    $emailBody .= "Content-Disposition: attachment; filename=\"$pdfFileName\"\r\n\r\n";
    $emailBody .= chunk_split(base64_encode($pdfContent)) . "\r\n";
    $emailBody .= "--$boundary--\r\n";
    
    // Send email
    $emailSent = mail($to, $subject, $emailBody, $headers);
    
    if ($emailSent) {
        echo json_encode([
            'success' => true, 
            'message' => 'Premium letter sent to your email with PDF attachment'
        ]);
    } else {
        echo json_encode([
            'success' => false, 
            'error' => 'Failed to send email'
        ]);
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false, 
        'error' => 'Error processing premium request: ' . $e->getMessage()
    ]);
}
?>
