<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;

class Property extends ResourceController
{
    use ResponseTrait;

    protected $format = 'json';

    public function health()
    {
        return $this->respond([
            'status' => 'success',
            'message' => 'Property Service is healthy',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }
}