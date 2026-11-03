package com.sccgroup.restaurant_management.admin.service;

import com.sccgroup.restaurant_management.common.exception.BusinessException;
import com.sccgroup.restaurant_management.common.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import javax.imageio.ImageIO;
import java.io.IOException;
import java.nio.file.*;
import java.util.UUID;

@Service
public class AdminImageService {
    private final Path directory;
    public AdminImageService(@Value("${app.admin.upload-dir:uploads/admin}") String directory) {
        this.directory = Path.of(directory).toAbsolutePath().normalize();
    }
    public String store(MultipartFile file) throws IOException {
        if (file.isEmpty() || file.getSize() > 5 * 1024 * 1024) throw new BusinessException("Chọn ảnh PNG/JPEG dung lượng tối đa 5 MB");
        // Decode and re-encode; never serve arbitrary uploaded bytes or trust the filename/MIME header.
        try (var input = ImageIO.createImageInputStream(file.getInputStream())) {
            var readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) throw new BusinessException("Tệp không phải ảnh PNG/JPEG hợp lệ");
            var reader = readers.next();
            try {
                String format = reader.getFormatName().toLowerCase();
                if (!format.equals("png") && !format.equals("jpeg") && !format.equals("jpg")) throw new BusinessException("Chỉ hỗ trợ ảnh PNG/JPEG");
                reader.setInput(input);
                if ((long)reader.getWidth(0) * reader.getHeight(0) > 16_000_000) throw new BusinessException("Ảnh tối đa 16 triệu điểm ảnh");
                var decoded = reader.read(0);
                Files.createDirectories(directory);
                String name = UUID.randomUUID() + ".png";
                ImageIO.write(decoded, "png", directory.resolve(name).toFile());
                return "/api/customer/media/" + name;
            } finally { reader.dispose(); }
        } catch (javax.imageio.IIOException e) { throw new BusinessException("Không thể đọc ảnh; vui lòng chọn ảnh PNG/JPEG khác"); }
    }
    public Path get(String name) {
        if (!name.matches("[a-f0-9-]{36}\\.png")) throw new ResourceNotFoundException("Không tìm thấy ảnh");
        Path file = directory.resolve(name);
        if (!Files.isRegularFile(file)) throw new ResourceNotFoundException("Không tìm thấy ảnh");
        return file;
    }
}
