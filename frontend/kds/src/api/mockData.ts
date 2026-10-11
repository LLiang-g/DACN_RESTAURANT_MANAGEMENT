import type { KdsOrder, KdsOrderItem, KitchenStation } from '../types';

export const STATIONS: KitchenStation[] = [
  { id: 1, name: 'Bếp nóng' },
  { id: 2, name: 'Bếp lạnh & món kèm' },
  { id: 3, name: 'Bếp hải sản' },
  { id: 4, name: 'Quầy nước' },
  { id: 5, name: 'Bếp lẩu' },
];

const ago = (minutes: number) => new Date(Date.now() - minutes * 60_000).toISOString();
const stationName = (id: number) => STATIONS.find((s) => s.id === id)!.name;

let nextId = 1;
function item(
  stationId: number,
  foodName: string,
  quantity: number,
  status: 'CONFIRMED' | 'COOKING' | 'DONE',
  estimatedCookingTime: number,
  extra: {
    startedMinAgo?: number;
    doneMinAgo?: number;
    options?: string[];
    note?: string;
    comboName?: string;
  } = {},
): KdsOrderItem {
  return {
    id: nextId++,
    foodName,
    quantity,
    status,
    stationId,
    stationName: stationName(stationId),
    estimatedCookingTime,
    startedCookingAt: extra.startedMinAgo != null ? ago(extra.startedMinAgo) : null,
    doneAt: extra.doneMinAgo != null ? ago(extra.doneMinAgo) : null,
    options: extra.options ?? [],
    note: extra.note ?? null,
    comboName: extra.comboName ?? null,
  };
}

export function createSeedOrders(): KdsOrder[] {
  return [
    // Order thử nghiệm: 10 món cùng một khu (Bếp nóng), tạo sớm nhất nên đứng thẻ đầu tiên.
    {
      id: 1050,
      floor: 'Tầng 2',
      tableNumber: 'B21',
      createdAt: ago(20),
      items: [
        item(1, 'Heo mọi nướng ống tre', 2, 'COOKING', 15, { startedMinAgo: 17, options: ['Thêm phần'] }),
        item(1, 'Giò heo hầm măng tươi', 1, 'COOKING', 15, { startedMinAgo: 6 }),
        item(1, 'Sườn heo nướng mật ong', 2, 'CONFIRMED', 15, { options: ['Cháy cạnh'] }),
        item(1, 'Ba chỉ heo kho mắm ruốc', 1, 'CONFIRMED', 15, { note: 'Ít mặn' }),
        item(1, 'Thịt heo xào chua ngọt', 2, 'CONFIRMED', 15),
        item(1, 'Cật heo xào hành gừng', 1, 'CONFIRMED', 15, { options: ['Không hành'] }),
        item(1, 'Heo rừng xào lăn', 1, 'CONFIRMED', 15, { comboName: 'Combo nhóm 6 người' }),
        item(1, 'Canh chua cá lóc', 1, 'CONFIRMED', 15, { comboName: 'Combo nhóm 6 người' }),
        item(1, 'Gà rang muối', 1, 'DONE', 15, { doneMinAgo: 3 }),
        item(1, 'Thịt kho tộ', 1, 'DONE', 15, { doneMinAgo: 8 }),
      ],
    },
    {
      id: 1042,
      floor: 'Tầng 1',
      tableNumber: 'B07',
      createdAt: ago(14),
      items: [
        item(1, 'Heo mọi nướng ống tre', 2, 'COOKING', 15, { startedMinAgo: 9, options: ['Thêm phần'] }),
        item(1, 'Giò heo hầm măng tươi', 1, 'COOKING', 15, { startedMinAgo: 16 }),
        item(1, 'Ba chỉ heo kho mắm ruốc', 1, 'CONFIRMED', 15, { note: 'Ít mặn' }),
        item(3, 'Mực nướng muối ớt', 1, 'COOKING', 20, { startedMinAgo: 5, options: ['Cay vừa'] }),
        item(2, 'Rau muống xào tỏi', 2, 'DONE', 8, { doneMinAgo: 2 }),
        item(4, 'Trà đá', 4, 'DONE', 2, { doneMinAgo: 6 }),
      ],
    },
    {
      id: 1043,
      floor: 'Tầng 2',
      tableNumber: 'B12',
      createdAt: ago(6),
      items: [
        item(5, 'Lẩu thái hải sản', 1, 'CONFIRMED', 25, { comboName: 'Combo nhóm 4 người' }),
        item(3, 'Mực chiên nước mắm', 1, 'CONFIRMED', 20, { comboName: 'Combo nhóm 4 người' }),
        item(2, 'Rau muống xào tỏi', 1, 'CONFIRMED', 8, { comboName: 'Combo nhóm 4 người', options: ['Không tỏi'] }),
        item(4, 'Nước cam ép', 2, 'CONFIRMED', 5),
      ],
    },
    {
      id: 1044,
      floor: 'Tầng 1',
      tableNumber: 'B03',
      createdAt: ago(3),
      items: [
        item(1, 'Thịt heo xào chua ngọt', 2, 'CONFIRMED', 15),
        item(1, 'Cật heo xào hành gừng', 1, 'CONFIRMED', 15, { options: ['Không hành'] }),
        item(4, 'Nước cam ép', 3, 'COOKING', 5, { startedMinAgo: 1 }),
      ],
    },
    {
      id: 1045,
      floor: 'Tầng 3',
      tableNumber: 'B18',
      createdAt: ago(1),
      items: [
        item(3, 'Mực nướng muối ớt', 2, 'CONFIRMED', 20, { note: 'Ra cùng lúc với món heo' }),
        item(1, 'Heo rừng xào lăn', 1, 'CONFIRMED', 15),
      ],
    },
  ];
}
