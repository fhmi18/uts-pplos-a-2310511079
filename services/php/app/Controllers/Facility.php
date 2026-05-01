<?php

namespace App\Controllers;

use CodeIgniter\API\ResponseTrait;
use App\Models\FacilityModel;

class Facility extends BaseAPIController
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
            if (!$this->currentUser) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Unauthorized: Missing user information from gateway.',
                ], 401);
            }

            $hasOwnerRole = isset($this->currentUser->role) && strtolower($this->currentUser->role) === 'owner';
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
}
