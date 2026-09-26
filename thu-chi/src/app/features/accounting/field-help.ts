/** Lời giải thích hiện khi rê chuột vào nút "i" cạnh mỗi ô nhập. */
export const FIELD_HELP = {
    name: 'Tên để phân biệt các phương án, ví dụ tên sản phẩm hoặc dự án. Không ảnh hưởng tới kết quả tính.',

    unitLabel:
        'Đơn vị đếm sản lượng: sp, ly, kg, suất ăn… Chỉ dùng để hiển thị, ví dụ "5.000 ghế".',

    unitPrice:
        'Giá bán một đơn vị sản phẩm (chưa gồm thuế GTGT). Ký hiệu p trong công thức.\nVí dụ: một ly cà phê bán 35.000đ → p = 35.000.',

    volume: 'Số đơn vị dự kiến bán được trong kỳ. Ký hiệu Q.\nKỳ (tháng, quý hay năm) phải khớp với kỳ của định phí: định phí nhập theo tháng thì sản lượng cũng tính theo tháng.',

    costs: 'Chia chi phí theo cách nó thay đổi khi sản lượng thay đổi:\n• Biến phí (v): tăng tỷ lệ thuận với sản lượng. Nhập số tiền cho MỘT đơn vị. Ví dụ: nguyên liệu, bao bì, hoa hồng theo sản phẩm.\n• Định phí (F): giữ nguyên dù bán nhiều hay ít (trong phạm vi hoạt động). Nhập TỔNG cả kỳ. Ví dụ: thuê mặt bằng, lương cố định, khấu hao.\nChi phí hỗn hợp (vd. tiền điện gồm phí cố định + theo mức dùng) nên tách thành hai dòng.',

    taxRate:
        'Thuế suất thuế thu nhập doanh nghiệp (t), tính trên lợi nhuận trước thuế và chỉ khi có lãi. Phổ biến là 20%.\nĐặt 0 nếu không muốn tính thuế.',

    targetProfit:
        'Mức lãi bạn muốn đạt trong kỳ (không bắt buộc).\nChọn "sau thuế" nếu đó là tiền còn lại sau khi nộp thuế TNDN; app tự quy đổi: LN trước thuế = LN sau thuế / (1 − t).',

    whatIf: 'Nhập % thay đổi so với số liệu gốc, số âm là giảm. Ví dụ: giá bán 10 = tăng giá 10%, biến phí −5 = giảm biến phí 5%.\nChỉ để thử nghiệm, số liệu đã lưu không bị sửa.',
} as const;
