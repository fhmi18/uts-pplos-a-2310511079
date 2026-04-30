<?php

namespace App\Controllers;

use CodeIgniter\RESTful\ResourceController;
use CodeIgniter\API\ResponseTrait;
use App\Models\PropertyModel;

class Property extends ResourceController
{
    use ResponseTrait;

    protected $format = 'json';
    protected $propertyModel;

    public function __construct()
    {
        $this->propertyModel = new PropertyModel();
    }

    public function health()
    {
        return $this->respond([
            'status' => 'success',
            'message' => 'Property Service is healthy',
            'timestamp' => date('Y-m-d H:i:s')
        ]);
    }

    // GET /api/property - List all properties
    public function index()
    {
        try {
            $filters = [
                'limit' => (int) ($this->request->getVar('limit') ?? 10),
                'offset' => (int) ($this->request->getVar('offset') ?? 0),
            ];

            $city = $this->request->getVar('city');
            $search = $this->request->getVar('search');
            $ownerId = $this->request->getVar('owner_id');

            if (!empty($city)) {
                $filters['city'] = $city;
            }

            if (!empty($search)) {
                $filters['search'] = $search;
            }

            if (!empty($ownerId)) {
                $filters['owner_id'] = (int) $ownerId;
            }

            $result = $this->propertyModel->getProperties($filters);

            return $this->respond([
                'status' => 'success',
                'message' => 'Properties retrieved successfully',
                'data' => $result['data'],
                'pagination' => [
                    'total' => $result['total'],
                    'limit' => $result['limit'],
                    'offset' => $result['offset'],
                ],
            ], 200);
        } catch (\Exception $e) {
            return $this->respond([
                'status' => 'error',
                'message' => 'Failed to retrieve properties',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    // POST /api/property - Create new property (Protected - Owner only)
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

            if (!$hasOwnerRole && !isset($decoded->role)) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Token missing role information. Please login again.',
                    'debug' => 'Token payload: ' . json_encode($decoded),
                ], 401);
            }

            if (!$hasOwnerRole) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Only owners can create properties. Your role: ' . $decoded->role,
                ], 403);
            }

            $data = $this->request->getJSON();

            if (empty($data->name) || empty($data->address)) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Name and address are required',
                ], 400);
            }

            $propertyData = [
                'owner_id' => $decoded->id,
                'name' => $data->name,
                'address' => $data->address,
                'description' => $data->description ?? null,
                'city' => $data->city ?? null,
                'province' => $data->province ?? null,
                'postal_code' => $data->postal_code ?? null,
                'phone_number' => $data->phone_number ?? null,
            ];

            $propertyId = $this->propertyModel->insert($propertyData);

            if (!$propertyId) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Failed to create property',
                    'errors' => $this->propertyModel->errors(),
                ], 400);
            }

            $property = $this->propertyModel->find($propertyId);

            return $this->respond([
                'status' => 'success',
                'message' => 'Property created successfully',
                'data' => $property,
            ], 201);
        } catch (\Exception $e) {
            return $this->respond([
                'status' => 'error',
                'message' => 'Failed to create property',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    // GET /api/property/:id - Show single property
    public function show($id = null)
    {
        try {
            if ($id === null) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Property ID is required',
                ], 400);
            }

            $property = $this->propertyModel->find($id);

            if (!$property) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Property not found',
                ], 404);
            }

            return $this->respond([
                'status' => 'success',
                'message' => 'Property retrieved successfully',
                'data' => $property,
            ], 200);
        } catch (\Exception $e) {
            return $this->respond([
                'status' => 'error',
                'message' => 'Failed to retrieve property',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    // PUT /api/property/:id - Update property (Protected - Owner only)
    public function update($id = null)
    {
        try {
            if ($id === null) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Property ID is required',
                ], 400);
            }

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
                    'message' => 'Only owners can update properties',
                ], 403);
            }

            // Check if property exists
            $property = $this->propertyModel->find($id);

            if (!$property) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Property not found',
                ], 404);
            }

            // Check if user owns this property
            if ($property['owner_id'] != $decoded->id) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'You can only update your own properties',
                ], 403);
            }

            $data = $this->request->getJSON();

            $updateData = [];

            if (isset($data->name)) {
                $updateData['name'] = $data->name;
            }

            if (isset($data->address)) {
                $updateData['address'] = $data->address;
            }

            if (isset($data->description)) {
                $updateData['description'] = $data->description;
            }

            if (isset($data->city)) {
                $updateData['city'] = $data->city;
            }

            if (isset($data->province)) {
                $updateData['province'] = $data->province;
            }

            if (isset($data->postal_code)) {
                $updateData['postal_code'] = $data->postal_code;
            }

            if (isset($data->phone_number)) {
                $updateData['phone_number'] = $data->phone_number;
            }

            if (empty($updateData)) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'No fields to update',
                ], 400);
            }

            $this->propertyModel->update($id, $updateData);

            $updatedProperty = $this->propertyModel->find($id);

            return $this->respond([
                'status' => 'success',
                'message' => 'Property updated successfully',
                'data' => $updatedProperty,
            ], 200);
        } catch (\Exception $e) {
            return $this->respond([
                'status' => 'error',
                'message' => 'Failed to update property',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    // DELETE /api/property/:id - Delete property (Protected - Owner only)
    public function delete($id = null)
    {
        try {
            if ($id === null) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Property ID is required',
                ], 400);
            }

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
                    'message' => 'Only owners can delete properties',
                ], 403);
            }

            // Check if property exists
            $property = $this->propertyModel->find($id);

            if (!$property) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'Property not found',
                ], 404);
            }

            // Check if user owns this property
            if ($property['owner_id'] != $decoded->id) {
                return $this->respond([
                    'status' => 'error',
                    'message' => 'You can only delete your own properties',
                ], 403);
            }

            $this->propertyModel->delete($id);

            return $this->respond([
                'status' => 'success',
                'message' => 'Property deleted successfully',
            ], 200);
        } catch (\Exception $e) {
            return $this->respond([
                'status' => 'error',
                'message' => 'Failed to delete property',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    // Helper: Extract token from Authorization header
    private function getTokenFromHeader()
    {
        $authHeader = $this->request->getHeader('Authorization');

        if (!$authHeader) {
            return null;
        }

        $headerValue = $authHeader->getValue();

        if (preg_match('/Bearer\s(\S+)/', $headerValue, $matches)) {
            return $matches[1];
        }

        return null;
    }

    // Helper: Verify JWT token (simple validation)
    private function verifyJWT($token)
    {
        try {
            $parts = explode('.', $token);

            if (count($parts) !== 3) {
                return null;
            }

            $payload = json_decode(base64_decode(strtr($parts[1], '-_', '+/')));

            if (isset($payload->exp) && $payload->exp < time()) {
                return null;
            }

            return $payload;
        } catch (\Exception $e) {
            return null;
        }
    }
}