<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use App\Models\FacilityModel;

class Facility extends ResourceController
{
    use ResponseTrait;

    protected $format = 'json';
    protected $facilityModel;

    public function __construct()
    {
        $this->facilityModel = new FacilityModel();
    }

    /**
     * GET /api/facilities - Get all facilities (optional search)
     */
    public function index()
    {
        try {
            $search = $this->request->getVar('search');
            $facilities = $this->facilityModel->getAllFacilities($search);

            return $this->respond([
                'status' => 'success',
                'message' => 'Facilities retrieved successfully',
                'data' => $facilities,
            ], 200);
        } catch (\Exception $e) {
            return $this->respond([
                'status' => 'error',
                'message' => 'Failed to retrieve facilities',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * GET /api/facilities/{facilityId} - Get single facility
     */
    public function show($facilityId = null)
    {
        try {
            if ($facilityId === null) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Facility ID is required',
                ], 400);
            }

            $facility = $this->facilityModel->find($facilityId);

            if (!$facility) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Facility not found',
                ], 404);
            }

            return $this->respond([
                'status' => 'success',
                'message' => 'Facility retrieved successfully',
                'data' => $facility,
            ], 200);
        } catch (\Exception $e) {
            return $this->respond([
                'status' => 'error',
                'message' => 'Failed to retrieve facility',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/facilities - Create new facility (Protected - Admin/Owner)
     */
    public function create()
    {
        try {
            $token = $this->getTokenFromHeader();
            if (!$token) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'No token provided',
                ], 401);
            }

            $decoded = $this->verifyJWT($token);
            if (!$decoded) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Invalid or expired token',
                ], 401);
            }

            $hasOwnerRole = isset($decoded->role) && strtolower($decoded->role) === 'owner';
            if (!$hasOwnerRole) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Only owners can create facilities',
                ], 403);
            }

            $data = $this->request->getJSON();

            if (empty($data->name)) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Facility name is required',
                ], 400);
            }

            $facilityData = [
                'name' => $data->name,
                'description' => $data->description ?? null,
                'icon' => $data->icon ?? null,
            ];

            $facilityId = $this->facilityModel->insert($facilityData);

            if (!$facilityId) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Failed to create facility',
                    'errors' => $this->facilityModel->errors(),
                ], 400);
            }

            $facility = $this->facilityModel->find($facilityId);

            return $this->respond([
                'status' => 'success',
                'message' => 'Facility created successfully',
                'data' => $facility,
            ], 201);
        } catch (\Exception $e) {
            return $this->respond([
                'status' => 'error',
                'message' => 'Failed to create facility',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Helper: Extract token from Authorization header
     */
    protected function getTokenFromHeader()
    {
        $header = $this->request->getHeaderLine('Authorization');
        if (preg_match('/Bearer\s+(.+)/', $header, $matches)) {
            return $matches[1];
        }
        return null;
    }

    /**
     * Helper: Verify JWT token
     */
    protected function verifyJWT($token)
    {
        $secret = 'UTS_SE-2_2026_A_2310511079';

        try {
            $decoded = json_decode(base64_decode(str_replace(['-', '_'], ['+', '/'], explode('.', $token)[1])));

            if (!isset($decoded->exp) || $decoded->exp < time()) {
                return null;
            }

            return $decoded;
        } catch (\Exception $e) {
            return null;
        }
    }
}
