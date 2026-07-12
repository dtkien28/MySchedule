describe('Module 2: Playlist, Music & AI System Tests', () => {
  beforeEach(() => {
    cy.login();
  });

  // TC-PLY-16: [System] Thao tác UI Chatbot
  it('TC-PLY-16: Tương tác Chatbot AI trên UI', () => {
    cy.intercept('POST', '/api/chatbot/chat', {
      statusCode: 200,
      body: { status: 'success', reply: 'Bạn nên học Toán' }
    }).as('chatApi');

    cy.visit('/dashboard');
    // Mở chatbot modal (giả sử có button)
    cy.get('button').contains('Chat').click({ force: true });
    cy.get('input[placeholder*="Hỏi AI"]').type('Hôm nay học gì?{enter}');
    
    // Check loading indicator
    cy.contains('đang gõ...').should('be.visible');
    
    cy.wait('@chatApi');
    // Check reply
    cy.contains('Bạn nên học Toán').should('be.visible');
  });

  // TC-PLY-17: [System] Lời chào AI Buổi Sáng
  it('TC-PLY-17: Hiển thị lời chào buổi sáng', () => {
    // Chỉnh giờ hệ thống giả lập bằng cách ghi đè Date object
    cy.clock(new Date(2026, 6, 12, 8, 0, 0).getTime());
    cy.visit('/dashboard');
    cy.contains(/buổi sáng/i).should('exist');
  });

  // TC-PLY-18: [System] Lời chào AI Buổi Tối
  it('TC-PLY-18: Hiển thị lời chào buổi tối', () => {
    cy.clock(new Date(2026, 6, 12, 22, 0, 0).getTime());
    cy.visit('/dashboard');
    cy.contains(/buổi tối/i).should('exist');
  });

  // TC-PLY-19: [System] Xoá nhạc khi đang phát trong phòng
  it('TC-PLY-19: Xóa bài hát đang phát', () => {
    // Tab 1: Đang phát bài hát, Polling trả về lỗi nếu không tìm thấy nhạc
    cy.intercept('GET', '**/api/rooms/*/sync', {
      statusCode: 200,
      body: { 
        status: 'success', 
        data: { room: { music_title: null }, members: [] } 
      }
    }).as('syncEmpty');

    cy.visit('/study/1');
    cy.wait('@syncEmpty');
    // Không có bài hát nào được phát hoặc hiển thị thông báo
    cy.contains('Chưa có bài hát').should('exist');
  });
});
