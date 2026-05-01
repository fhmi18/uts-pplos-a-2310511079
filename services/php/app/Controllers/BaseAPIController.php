<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\HTTP\RequestInterface;
use CodeIgniter\HTTP\ResponseInterface;
use Psr\Log\LoggerInterface;

abstract class BaseAPIController extends ResourceController
{
    protected $currentUser = null;

    public function initController(RequestInterface $request, ResponseInterface $response, LoggerInterface $logger)
    {
        parent::initController($request, $response, $logger);

        $userDataHeader = $this->request->getHeaderLine('X-User-Data');
        if ($userDataHeader) {
            $this->currentUser = json_decode($userDataHeader);
        }
    }
}