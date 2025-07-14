<?php

class file_url_drop extends rcube_plugin
{
    public $task = 'mail'; // Makes the plugin active only for the mail task

    function init()
    {
        // Register the handler for the action plugin.file_url_drop
        $this->register_action('plugin.file_url_drop', [$this, 'handle_remote_file']);
        $this->include_script('file_url_drop.js');
    }

    /**
     * Handles the plugin.file_url_drop action
     */
    public function handle_remote_file()
    {
        $remote_url = rcube_utils::get_input_value('_remote_url', rcube_utils::INPUT_POST);

        if (!$remote_url) {
            header('HTTP/1.1 400 Bad Request');
            echo json_encode(['error' => 'No remote URL provided.']);
            exit;
        }

        $file_contents = file_get_contents($remote_url);
        if ($file_contents === false) {
            header('HTTP/1.1 500 Internal Server Error');
            echo json_encode(['error' => 'Failed to download the file.']);
            exit;
        }

        $filename = basename($remote_url);
        $temp_file = tempnam(sys_get_temp_dir(), 'remote_file');
        file_put_contents($temp_file, $file_contents);

        // Serve the file as a downloadable object
        header('Content-Type: application/octet-stream');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Content-Length: ' . filesize($temp_file));
        readfile($temp_file);
        unlink($temp_file); // Clean up the temporary file
        exit;
    }
}