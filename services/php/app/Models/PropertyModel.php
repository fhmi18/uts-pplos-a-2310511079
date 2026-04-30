<?php

namespace App\Models;

use CodeIgniter\Model;

class PropertyModel extends Model
{
    protected $table = 'properties';
    protected $primaryKey = 'id';
    protected $useAutoIncrement = true;
    protected $returnType = 'array';
    protected $useSoftDeletes = false;
    protected $allowedFields = [
        'owner_id',
        'name',
        'address',
        'description',
        'city',
        'province',
        'postal_code',
        'phone_number',
        'created_at',
        'updated_at',
    ];

    protected $useTimestamps = true;
    protected $createdField = 'created_at';
    protected $updatedField = 'updated_at';

    public function getProperties(array $filters = []): array
    {
        $limit = isset($filters['limit']) ? (int) $filters['limit'] : 10;
        $offset = isset($filters['offset']) ? (int) $filters['offset'] : 0;

        $builder = $this->builder();

        if (!empty($filters['owner_id'])) {
            $builder->where('owner_id', (int) $filters['owner_id']);
        }

        if (!empty($filters['city'])) {
            $builder->where('city', $filters['city']);
        }

        if (!empty($filters['search'])) {
            $builder->groupStart()
                ->like('name', $filters['search'])
                ->orLike('address', $filters['search'])
                ->orLike('city', $filters['search'])
                ->groupEnd();
        }

        $total = $builder->countAllResults(false);

        $data = $builder
            ->orderBy('created_at', 'DESC')
            ->limit($limit, $offset)
            ->get()
            ->getResultArray();

        return [
            'data' => $data,
            'total' => $total,
            'limit' => $limit,
            'offset' => $offset,
        ];
    }
}
